import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, Upload, Square, FileText, Loader2, Save, Trash2, Calendar, Clock, Pencil } from 'lucide-react';
import { saveAudioFile, getAudioFiles, deleteAudioFile, updateAudioFileName } from '../services/memorySQLite';
import { useSummaryStore } from '../services/summaryStore';
import graphService from '../services/graphService';

interface AudioFile {
  id: number;
  name: string;
  transcript: string;
  created: string;
}

export default function AudioPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  
  // Audio history state
  const [audioHistory, setAudioHistory] = useState<AudioFile[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<AudioFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  // Live transcription state
  const [isLiveTranscribing, setIsLiveTranscribing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const intervalRef = React.useRef<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const setTranscriptGlobal = useSummaryStore(state => state.setTranscript);
  const [editingAudioId, setEditingAudioId] = useState<number | null>(null);
  const [editingAudioName, setEditingAudioName] = useState<string>('');
  const [editingPlaybackName, setEditingPlaybackName] = useState(false);
  const [playbackNameInput, setPlaybackNameInput] = useState('');

  useEffect(() => {
    loadAudioHistory();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (websocket) {
        websocket.close();
      }
    };
  }, []);

  const loadAudioHistory = async () => {
    try {
      const audioFiles = await getAudioFiles();
      const formattedAudioFiles = audioFiles.map((file: unknown[]) => ({
        id: file[0],
        name: file[1],
        transcript: file[3],
        created: file[4]
      }));
      setAudioHistory(formattedAudioFiles);
    } catch (error) {
      console.error('Error loading audio history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to index all existing audio transcripts for enhanced chat
  const indexAllTranscripts = async () => {
    console.log('🔍 Indexing all existing transcripts for enhanced chat...');
    let indexedCount = 0;
    let errorCount = 0;
    
    for (const audio of audioHistory) {
      try {
        const response = await fetch('http://localhost:5001/index-audio-transcript', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transcript: audio.transcript,
            user_id: 'local-user-1',
            audio_name: audio.name
          })
        });
        
        if (response.ok) {
          indexedCount++;
          console.log(`✅ Indexed: ${audio.name}`);
        } else {
          errorCount++;
          console.warn(`⚠️ Failed to index: ${audio.name}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error indexing ${audio.name}:`, error);
      }
    }
    
    console.log(`📊 Indexing complete: ${indexedCount} successful, ${errorCount} failed`);
    alert(`Indexing complete: ${indexedCount} transcripts indexed successfully, ${errorCount} failed.`);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Use WebM with Opus codec - widely supported and good quality
      // We'll convert to WAV on the backend for Whisper
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
        
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      audioChunksRef.current = [];
      
      // Set up live transcription WebSocket
      const ws = new WebSocket('ws://localhost:5001/ws/live-transcribe');
      setWebsocket(ws);
      
      ws.onopen = () => {
        console.log('WebSocket connected for live transcription');
        setIsLiveTranscribing(true);
        setLiveTranscript('Live transcription started...');
      };
      
      ws.onmessage = (event) => {
        console.log('Received WebSocket message:', event.data);
        try {
          const data = JSON.parse(event.data);
          console.log('Parsed WebSocket data:', data);
          
          if (data.type === 'connection_test') {
            console.log('✅ WebSocket connection test successful:', data.message);
            setLiveTranscript('Live transcription connected and ready...');
          } else if (data.type === 'transcript' && data.text) {
            console.log('Updating live transcript with:', data.text);
            setLiveTranscript(prev => {
              // Remove the connection message if it's there
              const cleanPrev = prev === 'Live transcription connected and ready...' ? '' : prev;
              const newTranscript = cleanPrev + (cleanPrev ? ' ' : '') + data.text;
              console.log('New transcript will be:', newTranscript);
              return newTranscript;
            });
          } else if (data.type === 'error') {
            console.error('Transcription error:', data.message);
            setLiveTranscript(prev => prev + ' [Error: ' + data.message + ']');
          } else {
            console.log('Received message with type:', data.type, 'text:', data.text);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsLiveTranscribing(false);
        // Show user that live transcription is not available
        setLiveTranscript('Live transcription not available - will transcribe after recording');
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        setIsLiveTranscribing(false);
        if (event.code !== 1000) { // Normal closure
          setLiveTranscript(prev => prev + ' [Connection closed]');
        }
      };
      
      let accumulatedChunks: Blob[] = [];
      let lastTranscriptionTime = 0;
      
      mediaRecorderRef.current.ondataavailable = async (event) => {
        audioChunksRef.current.push(event.data);
        accumulatedChunks.push(event.data);
        
        // Send accumulated chunks for transcription every 1.5 seconds
        const currentTime = Date.now();
        if (currentTime - lastTranscriptionTime > 1500 && accumulatedChunks.length > 0) {
          try {
            // Create a complete audio file from accumulated chunks
            const audioBlob = new Blob(accumulatedChunks, { type: mimeType });
            const arrayBuffer = await audioBlob.arrayBuffer();
            
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(arrayBuffer);
              lastTranscriptionTime = currentTime;
              accumulatedChunks = []; // Reset accumulated chunks
              console.log('Sent audio chunk for transcription');
            }
          } catch (error) {
            console.error('Error sending audio chunk:', error);
          }
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setAudioFile(audioBlob as File);
        
        // Use live transcript if available, otherwise will transcribe after
        if (liveTranscript && 
            liveTranscript !== 'Live transcription not available - will transcribe after recording' &&
            !liveTranscript.includes('[Error:') &&
            !liveTranscript.includes('[Connection closed]')) {
          setTranscription(liveTranscript.trim());
        }
        
        setIsLiveTranscribing(false);
        if (ws) {
          ws.close(1000, 'Recording stopped'); // Normal closure
          setWebsocket(null);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording with smaller time slices for more frequent data
      mediaRecorderRef.current.start(500); // 0.5 second chunks for more responsive transcription
      setIsRecording(true);
      setRecordingTime(0);
      setLiveTranscript('');
      
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
    }
  };

  const processAudio = async () => {
    if (!audioFile) return;
    setIsProcessing(true);
    setTranscription('');
    setSavedMessage(''); // Clear any previous save message
    try {
      const formData = new FormData();
      formData.append('file', audioFile, 'audio.wav');
      const res = await fetch('http://localhost:5001/transcribe', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.transcript) {
        setTranscription(data.transcript);
        setTranscriptGlobal(data.transcript);
        
        // Automatically save to memory after successful transcription
                  console.log('💾 Auto-saving conversation...');
          setIsSaving(true);
          try {
            const fileName = audioFile.name || `recording_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.wav`;
            console.log('📁 Saving audio file:', fileName);
            await saveAudioFile(fileName, audioFile, data.transcript);

            // Index transcript in backend for enhanced chat search
            console.log('🔍 Indexing transcript for enhanced chat...');
            try {
              const indexResponse = await fetch('http://localhost:5001/index-audio-transcript', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  transcript: data.transcript,
                  user_id: 'local-user-1',
                  audio_name: fileName
                })
              });
              
              if (indexResponse.ok) {
                const indexResult = await indexResponse.json();
                console.log('✅ Transcript indexed for enhanced chat:', indexResult);
              } else {
                console.warn('⚠️ Failed to index transcript for enhanced chat');
              }
            } catch (indexErr) {
              console.warn('⚠️ Error indexing transcript for enhanced chat:', indexErr);
            }

            console.log('🧠 Adding transcript to knowledge graph...');
            console.log('📝 Transcript:', data.transcript.substring(0, 100) + '...');
            try {
              const result = await graphService.addTranscriptToGraph(data.transcript, 'local-user-1');
              console.log('✅ Knowledge graph updated successfully:', result);
              setSavedMessage('Saved to Memory & Knowledge Graph Updated!');
            } catch (graphErr) {
              console.error('❌ Graph update error:', graphErr);
              setSavedMessage('Saved to Memory!');
            }
          
          // Reload audio history
          await loadAudioHistory();
          
          setTimeout(() => setSavedMessage(''), 3000);
        } catch (error) {
          console.error('Error auto-saving conversation:', error);
          setSavedMessage('Error saving to memory');
          setTimeout(() => setSavedMessage(''), 3000);
        }
        setIsSaving(false);
      } else {
        setTranscription('No transcription received.');
        setTranscriptGlobal('');
      }
    } catch (err) {
      setTranscription('Error transcribing audio.');
      setTranscriptGlobal('');
      console.error(err);
    }
    setIsProcessing(false);
  };



  const handleDeleteAudio = async (id: number) => {
    if (!confirm('Are you sure you want to delete this audio file?')) return;
    
    setDeletingId(id);
    try {
      await deleteAudioFile(id);
      setAudioHistory(prev => prev.filter(audio => audio.id !== id));
      if (selectedAudio?.id === id) {
        setSelectedAudio(null);
      }
    } catch (error) {
      console.error('Error deleting audio file:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTimeDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleAudioNameEdit = async (audio: AudioFile, newName: string) => {
    await updateAudioFileName(audio.id, newName);
    await loadAudioHistory(); // refresh sidebar
    if (selectedAudio && selectedAudio.id === audio.id) {
      setSelectedAudio({ ...selectedAudio, name: newName });
    }
    setEditingAudioId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0C10] via-[#0B0E11] to-[#000000]">
      <div className="pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              Audio Intelligence
            </h1>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Advanced speech recognition with live transcription and audio history
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Audio History Sidebar */}
            <motion.div
              className="lg:col-span-1"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white flex items-center">
                    <FileText className="mr-2" size={20} />
                    Audio History
                  </h3>
                  {audioHistory.length > 0 && (
                    <button
                      onClick={indexAllTranscripts}
                      className="text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 px-2 py-1 rounded transition-colors"
                      title="Index all transcripts for enhanced chat search"
                    >
                      Index for Chat
                    </button>
                  )}
                </div>
                
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-cyan-400" size={24} />
                  </div>
                ) : audioHistory.length === 0 ? (
                  <p className="text-white/40 text-center py-8">No audio files yet</p>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {audioHistory.map((audio) => (
                      <motion.div
                        key={audio.id}
                        className={`p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                          selectedAudio?.id === audio.id
                            ? 'bg-cyan-500/20 border border-cyan-400/30'
                            : 'bg-black/20 border border-white/5 hover:bg-black/30'
                        }`}
                        onClick={() => setSelectedAudio(audio)}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          {editingAudioId === audio.id ? (
                            <input
                              className="text-white font-medium text-sm truncate flex-1 mr-2 bg-black/40 border border-cyan-400/40 rounded px-2 py-1 outline-none"
                              value={editingAudioName}
                              autoFocus
                              onChange={e => setEditingAudioName(e.target.value)}
                              onBlur={async () => {
                                if (editingAudioName.trim() && editingAudioName !== audio.name) {
                                  await handleAudioNameEdit(audio, editingAudioName.trim());
                                }
                              }}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                  if (editingAudioName.trim() && editingAudioName !== audio.name) {
                                    await handleAudioNameEdit(audio, editingAudioName.trim());
                                  }
                                } else if (e.key === 'Escape') {
                                  setEditingAudioId(null);
                                }
                              }}
                            />
                          ) : (
                            <h4
                              className="text-white font-medium text-sm truncate flex-1 mr-2"
                              onDoubleClick={e => {
                                e.stopPropagation();
                                setEditingAudioId(audio.id);
                                setEditingAudioName(audio.name);
                              }}
                              title="Double-click to rename"
                            >
                              {audio.name}
                            </h4>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAudio(audio.id);
                            }}
                            className="text-white/40 hover:text-red-400 transition-colors"
                            disabled={deletingId === audio.id}
                          >
                            {deletingId === audio.id ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                        
                        <p className="text-white/60 text-xs mb-2">
                          {truncateText(audio.transcript, 80)}
                        </p>
                        
                        <div className="flex items-center justify-between text-white/40 text-xs">
                          <span className="flex items-center">
                            <Calendar size={12} className="mr-1" />
                            {formatDate(audio.created)}
                          </span>
                          <span className="flex items-center">
                            <Clock size={12} className="mr-1" />
                            {formatTimeDisplay(audio.created)}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Main Recording/Playback Panel */}
            <motion.div
              className="lg:col-span-2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
                {selectedAudio ? (
                  /* Selected Audio View */
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-semibold text-white">Audio Playback</h3>
                      <button
                        onClick={() => setSelectedAudio(null)}
                        className="text-white/60 hover:text-white transition-colors"
                      >
                        ← Back to Recording
                      </button>
                    </div>
                    
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center mb-2">
                          {editingPlaybackName ? (
                            <input
                              className="text-white font-medium text-lg bg-black/40 border border-cyan-400/40 rounded px-2 py-1 outline-none mr-2"
                              value={playbackNameInput}
                              autoFocus
                              onChange={e => setPlaybackNameInput(e.target.value)}
                              onBlur={async () => {
                                if (playbackNameInput.trim() && playbackNameInput !== selectedAudio.name) {
                                  await updateAudioFileName(selectedAudio.id, playbackNameInput.trim());
                                  await loadAudioHistory();
                                  // Update selectedAudio with new name
                                  setSelectedAudio(prev => prev ? { ...prev, name: playbackNameInput.trim() } : prev);
                                }
                                setEditingPlaybackName(false);
                              }}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                  if (playbackNameInput.trim() && playbackNameInput !== selectedAudio.name) {
                                    await updateAudioFileName(selectedAudio.id, playbackNameInput.trim());
                                    await loadAudioHistory();
                                    setSelectedAudio(prev => prev ? { ...prev, name: playbackNameInput.trim() } : prev);
                                  }
                                  setEditingPlaybackName(false);
                                } else if (e.key === 'Escape') {
                                  setEditingPlaybackName(false);
                                }
                              }}
                            />
                          ) : (
                            <>
                              <h4 className="text-white font-medium text-lg mr-2">{selectedAudio.name}</h4>
                              <button
                                className="text-cyan-400 hover:text-cyan-200 p-1"
                                title="Edit name"
                                onClick={() => {
                                  setEditingPlaybackName(true);
                                  setPlaybackNameInput(selectedAudio.name);
                                }}
                              >
                                <Pencil size={16} />
                              </button>
                            </>
                          )}
                        </div>
                        <div className="flex items-center text-white/60 text-sm mb-4">
                          <Calendar size={14} className="mr-1" />
                          {formatDate(selectedAudio.created)} at {formatTimeDisplay(selectedAudio.created)}
                        </div>
                      </div>
                      
                      <div className="bg-black/20 rounded-2xl p-6 border border-white/5">
                        <h5 className="text-white font-medium mb-4">Transcript</h5>
                        <p className="text-white/90 leading-relaxed">{selectedAudio.transcript}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Recording Interface */
                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-8">Record & Transcribe</h3>
                    
                    <div className="space-y-8">
                      {/* Recording Controls */}
                      <div className="text-center">
                        <motion.button
                          onClick={isRecording ? stopRecording : startRecording}
                          className={`w-24 h-24 rounded-full flex items-center justify-center text-white font-bold transition-all duration-300 ${
                            isRecording 
                              ? 'bg-red-500/20 border-2 border-red-500' 
                              : 'bg-white/5 border-2 border-white/20 hover:border-cyan-400/50'
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {isRecording ? <Square size={28} /> : <Mic size={28} />}
                        </motion.button>
                        
                        <p className="text-white/60 mt-4 font-medium">
                          {isRecording ? `Recording: ${formatTime(recordingTime)}` : 'Click to record'}
                        </p>
                        
                        {isLiveTranscribing && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 flex items-center justify-center text-cyan-400"
                          >
                            <Loader2 className="animate-spin mr-2" size={16} />
                            Live Transcribing...
                          </motion.div>
                        )}
                      </div>

                      {/* File Upload */}
                      <div className="text-center">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="audio/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <motion.button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center justify-center space-x-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white px-8 py-4 rounded-2xl transition-all duration-300 mx-auto"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Upload size={20} />
                          <span className="font-medium">Upload Audio</span>
                        </motion.button>
                      </div>

                      {/* Audio Player */}
                      {audioUrl && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="bg-black/20 rounded-2xl p-6"
                        >
                          <audio controls className="w-full">
                            <source src={audioUrl} type="audio/wav" />
                          </audio>
                        </motion.div>
                      )}

                      {/* Live Transcript Preview */}
                      {isLiveTranscribing && liveTranscript && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-cyan-500/10 border border-cyan-400/20 rounded-2xl p-6"
                        >
                          <h4 className="text-cyan-400 font-medium mb-3">Live Transcript</h4>
                          <p className="text-white/90 leading-relaxed">{liveTranscript}</p>
                        </motion.div>
                      )}

                      {/* Process Button */}
                      {audioFile && !isRecording && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-center"
                        >
                          <motion.button
                            onClick={processAudio}
                            disabled={isProcessing}
                            className="bg-gradient-to-r from-[#0B1D35] to-[#2C0B35] hover:from-[#0F2142] hover:to-[#341242] text-white px-10 py-4 rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 border border-white/10"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="inline mr-3 animate-spin" size={20} />
                                Processing...
                              </>
                            ) : (
                              <>
                                <FileText className="inline mr-3" size={20} />
                                Analyze Audio
                              </>
                            )}
                          </motion.button>
                        </motion.div>
                      )}

                      {/* Results */}
                      {transcription && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-6"
                        >
                          <div className="bg-black/20 rounded-2xl p-6 border border-white/5">
                            <h4 className="text-white font-medium mb-4">Transcription</h4>
                            <p className="text-white/90 leading-relaxed">{transcription}</p>
                          </div>
                          
                          <div className="flex items-center justify-between pt-4 border-t border-white/10">
                            {isSaving ? (
                              <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center space-x-2"
                              >
                                <Loader2 className="animate-spin" size={16} />
                                <span className="text-sm font-medium text-cyan-400">Saving to Memory...</span>
                              </motion.div>
                            ) : savedMessage ? (
                              <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center space-x-2"
                              >
                                <Save size={16} />
                                <span className="text-sm font-medium text-green-400">{savedMessage}</span>
                              </motion.div>
                            ) : (
                              <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center space-x-2"
                              >
                                <Save size={16} />
                                <span className="text-sm font-medium text-green-400">Saved to Memory</span>
                              </motion.div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}