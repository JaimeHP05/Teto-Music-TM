// App.js
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, Button, FlatList, TouchableOpacity, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import axios from 'axios';

export default function App() {
  // Cambia BACKEND_URL por la URL pública de tu backend desplegado (por ejemplo, en Render o Fly.io)
  const BACKEND_URL = "https://teto-music-tm.onrender.com";
  
  const [downloadUrl, setDownloadUrl] = useState('');
  const [serverFiles, setServerFiles] = useState([]); // Archivos disponibles en el backend
  const [localFiles, setLocalFiles] = useState([]);   // Archivos descargados localmente en el móvil
  const [message, setMessage] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const soundRef = useRef(null);

  // Directorio local para guardar archivos: documentDirectory + 'music/'
  const LOCAL_FOLDER = FileSystem.documentDirectory + 'music/';
  
  useEffect(() => {
    // Crea la carpeta local si no existe
    FileSystem.getInfoAsync(LOCAL_FOLDER).then(info => {
      if (!info.exists) {
        FileSystem.makeDirectoryAsync(LOCAL_FOLDER, { intermediates: true });
      }
    });
    fetchServerFiles();
    loadLocalFiles();
  }, []);

  // Consulta el backend para obtener la lista de archivos disponibles
  const fetchServerFiles = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/files`);
      setServerFiles(response.data.files);
    } catch (error) {
      console.log("Error al obtener archivos del servidor:", error);
    }
  };

  // Descarga el archivo desde el backend y lo guarda localmente
  const downloadFile = async (filename) => {
    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        `${BACKEND_URL}/play/${filename}`,
        LOCAL_FOLDER + filename,
        {},
        progress => {
          // Puedes implementar una barra de progreso aquí si lo deseas.
        }
      );
      const { uri } = await downloadResumable.downloadAsync();
      Alert.alert("Descarga finalizada", `Archivo guardado en: ${uri}`);
      loadLocalFiles();
    } catch (error) {
      Alert.alert("Error", "No se pudo descargar el archivo.");
      console.log(error);
    }
  };

  // Lista los archivos que se han descargado localmente en el dispositivo
  const loadLocalFiles = async () => {
    try {
      const files = await FileSystem.readDirectoryAsync(LOCAL_FOLDER);
      setLocalFiles(files);
    } catch (error) {
      console.log("Error al leer archivos locales:", error);
    }
  };

  // Envía la URL al backend para iniciar la descarga
  const triggerDownload = async () => {
    try {
      setMessage("Iniciando descarga en el servidor...");
      await axios.post(`${BACKEND_URL}/download`, { url: downloadUrl });
      setMessage("Descarga iniciada en el servidor. Actualiza la lista en unos segundos.");
      // Espera unos segundos y actualiza la lista de archivos disponibles en el servidor
      setTimeout(fetchServerFiles, 5000);
    } catch (error) {
      setMessage("Error al iniciar la descarga en el servidor.");
      console.log(error);
    }
  };

  // Reproduce el archivo local seleccionado
  const playAudio = async (index) => {
    try {
      if (soundRef.current !== null) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      const filename = localFiles[index];
      const { sound } = await Audio.Sound.createAsync(
        { uri: LOCAL_FOLDER + filename },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
      setCurrentIndex(index);
      setIsPlaying(true);
    } catch (error) {
      console.log("Error al reproducir audio:", error);
    }
  };

  // Actualiza el estado de la reproducción
  const onPlaybackStatusUpdate = status => {
    if (status.isLoaded) {
      setPlaybackPosition(status.positionMillis);
      setPlaybackDuration(status.durationMillis);
      if (status.didJustFinish) {
        // Reproduce la siguiente canción, si existe
        if (currentIndex < localFiles.length - 1) {
          playAudio(currentIndex + 1);
        } else {
          setIsPlaying(false);
        }
      }
    }
  };

  const handlePlayPause = async () => {
    if (soundRef.current) {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const playNext = async () => {
    if (currentIndex < localFiles.length - 1) {
      playAudio(currentIndex + 1);
    }
  };

  const playPrevious = async () => {
    if (currentIndex > 0) {
      playAudio(currentIndex - 1);
    }
  };

  // Convierte milisegundos a minutos:segundos
  const formatTime = millis => {
    const totalSeconds = millis / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mi App de Música Personal</Text>
      
      <View style={styles.section}>
        <Text style={styles.label}>Ingresa el enlace a descargar:</Text>
        <TextInput 
          style={styles.input}
          placeholder="URL del video o audio"
          value={downloadUrl}
          onChangeText={setDownloadUrl}
        />
        <Button title="Iniciar Descarga en Servidor" onPress={triggerDownload} />
        <Text style={styles.message}>{message}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subtitle}>Archivos en el Servidor:</Text>
        <FlatList
          data={serverFiles}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <View style={styles.fileItem}>
              <Text>{item}</Text>
              <Button title="Descargar al Móvil" onPress={() => downloadFile(item)} />
            </View>
          )}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.subtitle}>Reproductor Local:</Text>
        <FlatList
          data={localFiles}
          keyExtractor={item => item}
          horizontal
          renderItem={({ item, index }) => (
            <TouchableOpacity 
              style={[
                styles.trackItem, 
                index === currentIndex ? styles.selectedTrack : {}
              ]}
              onPress={() => playAudio(index)}
            >
              <Text style={styles.trackText}>{item}</Text>
            </TouchableOpacity>
          )}
        />

        {soundRef.current && (
          <View style={styles.controls}>
            <Button title="◄◄" onPress={playPrevious} />
            <Button title={isPlaying ? "Pause" : "Play"} onPress={handlePlayPause} />
            <Button title="►►" onPress={playNext} />
          </View>
        )}
        {soundRef.current && (
          <Text style={styles.time}>
            {formatTime(playbackPosition)} / {formatTime(playbackDuration)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  section: { marginBottom: 25 },
  label: { fontSize: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 5, marginBottom: 8 },
  message: { textAlign: 'center', color: 'green', marginVertical: 8 },
  subtitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  fileItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#eee' },
  trackItem: { padding: 10, marginRight: 5, borderWidth: 1, borderColor: '#888', borderRadius: 5 },
  selectedTrack: { backgroundColor: '#ddd' },
  trackText: { fontSize: 12 },
  controls: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 },
  time: { textAlign: 'center', fontSize: 16 }
});
