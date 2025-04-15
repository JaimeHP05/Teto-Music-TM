import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, Button, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Audio } from 'expo-av';
import axios from 'axios';

export default function App() {
  const BACKEND_URL = "https://teto-music-tm.onrender.com"; // Cambia esto por la URL de tu servidor
  const [downloadUrl, setDownloadUrl] = useState('');
  const [serverFiles, setServerFiles] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const soundRef = useRef(null);

  useEffect(() => {
    fetchServerFiles();
  }, []);

  // Obtener la lista de archivos disponibles en el servidor
  const fetchServerFiles = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/files`);
      setServerFiles(response.data.files);
    } catch (error) {
      console.error("Error al obtener archivos del servidor:", error);
    }
  };

  // Enviar una URL al servidor para iniciar la descarga
  const triggerDownload = async () => {
    try {
      await axios.post(`${BACKEND_URL}/download`, { url: downloadUrl });
      Alert.alert("Descarga iniciada en el servidor.");
      setTimeout(fetchServerFiles, 5000); // Espera unos segundos y actualiza la lista
    } catch (error) {
      Alert.alert("Error al iniciar la descarga.");
      console.error(error);
    }
  };

  // Reproducir un archivo MP3 directamente desde el servidor
  const playAudio = async (filename) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: `${BACKEND_URL}/play/${filename}` }, // URL del archivo en el servidor
        { shouldPlay: true }
      );

      soundRef.current = sound;
      setCurrentFile(filename);
      setIsPlaying(true);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          setCurrentFile(null);
        }
      });
    } catch (error) {
      console.error("Error al reproducir audio:", error);
    }
  };

  // Pausar o reanudar la reproducción
  const togglePlayPause = async () => {
    if (soundRef.current) {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Teto Music App</Text>
      <TextInput
        style={styles.input}
        placeholder="URL del video de YouTube"
        value={downloadUrl}
        onChangeText={setDownloadUrl}
      />
      <Button title="Descargar en el servidor" onPress={triggerDownload} />
      <Text style={styles.subtitle}>Archivos disponibles en el servidor:</Text>
      <FlatList
        data={serverFiles}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => playAudio(item)}>
            <Text style={styles.fileItem}>{item}</Text>
          </TouchableOpacity>
        )}
      />
      {currentFile && (
        <View style={styles.player}>
          <Text style={styles.nowPlaying}>Reproduciendo: {currentFile}</Text>
          <Button title={isPlaying ? "Pausar" : "Reanudar"} onPress={togglePlayPause} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10 },
  subtitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20 },
  fileItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  player: { marginTop: 20, alignItems: 'center' },
  nowPlaying: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
});
