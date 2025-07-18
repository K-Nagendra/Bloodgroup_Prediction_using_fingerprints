from flask import Flask, render_template, request, jsonify
import numpy as np
import pandas as pd
import cv2
import os
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout, BatchNormalization
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from sklearn.preprocessing import LabelEncoder

# Step 1: Load and Preprocess Data
def load_data(data_directory):
    images, labels = [], []
    
    for label in os.listdir(data_directory):
        label_directory = os.path.join(data_directory, label)
        if os.path.isdir(label_directory):
            for image_file in os.listdir(label_directory):
                image_path = os.path.join(label_directory, image_file)
                image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
                if image is not None:
                    image = cv2.resize(image, (128, 128))
                    image = cv2.GaussianBlur(image, (3, 3), 0)
                    image = cv2.equalizeHist(image)
                    images.append(image)
                    labels.append(label)
    return np.array(images), np.array(labels)

current_directory = os.getcwd()
data_directory = os.path.join(current_directory, 'BG_Dataset')
X, y = load_data(data_directory)

X = X.astype('float32') / 255.0
X = np.expand_dims(X, axis=-1)

label_encoder = LabelEncoder()
y_encoded = label_encoder.fit_transform(y)

X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42)

datagen = ImageDataGenerator(rotation_range=20, width_shift_range=0.2, height_shift_range=0.2,
                             shear_range=0.2, zoom_range=0.2, horizontal_flip=True, fill_mode='nearest')

model_path = 'blood_group_detection_model.h5'
if os.path.exists(model_path):
    model = load_model(model_path)
    print("Loaded pre-trained model.")
else:
    model = Sequential([
        Conv2D(32, (3, 3), activation='relu', input_shape=(128, 128, 1)),
        BatchNormalization(),
        MaxPooling2D(pool_size=(2, 2)),
        
        Conv2D(64, (3, 3), activation='relu'),
        BatchNormalization(),
        MaxPooling2D(pool_size=(2, 2)),
        
        Conv2D(128, (3, 3), activation='relu'),
        BatchNormalization(),
        MaxPooling2D(pool_size=(2, 2)),
        
        Flatten(),
        Dense(256, activation='relu'),
        Dropout(0.5),
        Dense(len(np.unique(y_encoded)), activation='softmax')
    ])
    
    model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
    model.fit(datagen.flow(X_train, y_train, batch_size=32), epochs=30, validation_data=(X_test, y_test))
    model.save(model_path)
    print("Model trained and saved.")

def predict_blood_group(image):
    image = np.expand_dims(image, axis=-1)
    image = image.astype('float32') / 255.0
    image = np.expand_dims(image, axis=0)
    
    prediction = model.predict(image)
    predicted_class = np.argmax(prediction, axis=1)
    predicted_probabilities = prediction[0]
    return label_encoder.inverse_transform(predicted_class)[0], predicted_probabilities

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        # Read and preprocess image
        image = cv2.imdecode(np.frombuffer(file.read(), np.uint8), cv2.IMREAD_GRAYSCALE)
        if image is None:
            return jsonify({'error': 'Invalid image file'}), 400
        
        image = cv2.resize(image, (128, 128))
        
        # Make prediction
        predicted_blood_group, predicted_probabilities = predict_blood_group(image)
        
        # Prepare results
        blood_group_labels = label_encoder.classes_
        confidence_percentages = {
            label: float(prob * 100) 
            for label, prob in zip(blood_group_labels, predicted_probabilities)
        }

        # Swap confidence values of positive and negative blood groups
        swap_pairs = [('A+', 'A-'), ('B+', 'B-'), ('AB+', 'AB-'), ('O+', 'O-')]
        swapped_confidence = confidence_percentages.copy()
        for pos, neg in swap_pairs:
            if pos in confidence_percentages and neg in confidence_percentages:
                swapped_confidence[pos], swapped_confidence[neg] = confidence_percentages[neg], confidence_percentages[pos]

        # Recalculate predicted blood group based on swapped confidence values
        predicted_blood_group = max(swapped_confidence, key=swapped_confidence.get)

        return jsonify({
            'predicted_blood_group': predicted_blood_group,
            'confidence_percentages': swapped_confidence
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def print_dataset_details(data_directory):
    import os
    details = []
    for dir_name in sorted(os.listdir(data_directory)):
        dir_path = os.path.join(data_directory, dir_name)
        if os.path.isdir(dir_path):
            count = len([f for f in os.listdir(dir_path) if os.path.isfile(os.path.join(dir_path, f))])
            details.append(f"{dir_name}: {count} images")
    max_length = max(len(line) for line in details)
    print("+" + "-" * (max_length + 2) + "+")
    for line in details:
        print("| " + line.ljust(max_length) + " |")
    print("+" + "-" * (max_length + 2) + "+")

if __name__ == "__main__":
    current_directory = os.getcwd()
    data_directory = os.path.join(current_directory, 'BG_Dataset')
    print_dataset_details(data_directory)
    app.run(host='0.0.0.0', port=5000, debug=True)
