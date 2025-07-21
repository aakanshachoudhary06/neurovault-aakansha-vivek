from flask import Flask, request, jsonify
import whisper
import tempfile
import os

app = Flask(__name__)
model = whisper.load_model("base")  # You can use "small", "medium", etc.

@app.route('/transcribe', methods=['POST'])
def transcribe():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    audio_file = request.files['audio']
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        audio_file.save(tmp.name)
        result = model.transcribe(tmp.name)
        os.unlink(tmp.name)
    return jsonify({'transcription': result['text']})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001) 