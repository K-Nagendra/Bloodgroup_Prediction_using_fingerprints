# Bloodgroup Prediction Using Fingerprints

This project is a Flask web application that uses a convolutional neural network (CNN) model to predict blood groups based on fingerprint images.

## Features

- Loads and preprocesses fingerprint images from the dataset.
- Uses a pre-trained CNN model or trains a new model if none exists.
- Provides a web interface to upload fingerprint images and get blood group predictions.
- Displays confidence percentages for each blood group.
- Built with Flask, TensorFlow/Keras, OpenCV, and scikit-learn.

## Setup and Installation

1. Clone the repository or download the project files.

2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the Flask app:
   ```bash
   python3 project.py
   ```

5. Open your browser and navigate to `http://localhost:5000` to access the app.

## Deployment

The app can be deployed on platforms like Heroku or Render. For Heroku deployment, ensure you have the following files:

- `Procfile` with the command: `web: gunicorn project:app`
- `runtime.txt` specifying the Python version (e.g., `python-3.10.12`)
- `requirements.txt` listing all dependencies

## Usage

- Upload a fingerprint image on the home page.
- The app will process the image and predict the blood group.
- Confidence percentages for each blood group will be displayed.

## License

This project is open source and available under the MIT License.
