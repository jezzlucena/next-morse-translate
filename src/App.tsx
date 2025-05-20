import { useState } from 'react'
import './App.css'
import {
  LATIN_TO_MORSE,
  MORSE_ELEMENT_TO_DURATION,
  MORSE_FREQUENCY_HZ,
  MORSE_MAX_AMPLITUDE,
  MORSE_SAMPLE_RATE,
  MORSE_TIME_UNIT_MS,
  MORSE_TO_LATIN
} from './utils/constants';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function App() {
  const [latinText, setLatinText] = useState("");
  const [morseText, setMorseText] = useState("");
  const [sineWave, setSineWave] = useState<Float32Array<ArrayBuffer> | null>(null);
  const [error, setError] = useState<string>();

  const audioContext = new AudioContext();
  const gainNode = audioContext.createGain();
  gainNode.gain.value = MORSE_MAX_AMPLITUDE; // Adjusts the volume

  function generateSineWave(morse: string) {
    const amplitudes: { value: number, duration: number }[] = [];
    morse.split("").forEach(morseChar => {
      const duration = (MORSE_ELEMENT_TO_DURATION[morseChar] || 0) * MORSE_TIME_UNIT_MS / 1000;
      const value = ['.', '-'].includes(morseChar) ? MORSE_MAX_AMPLITUDE : 0;
      amplitudes.push({ value, duration });
      amplitudes.push({ value: 0, duration: MORSE_TIME_UNIT_MS / 1000 });
    });

    const totalDuration = amplitudes.reduce((acc, amp) => acc + amp.duration, 0);
    const totalSamples = MORSE_SAMPLE_RATE * totalDuration;
    const data = new Float32Array(totalSamples);

    let index = 0;
    amplitudes.forEach(amp => {
      const numSamples = MORSE_SAMPLE_RATE * amp.duration;
      for (let i = 0; i < numSamples; i++) {
        if (amp.value) {
          const time = index / MORSE_SAMPLE_RATE;
          data[index] = amp.value * Math.sin(2 * Math.PI * MORSE_FREQUENCY_HZ * time);
        } else {
          data[index] = 0;
        }
        index++;
      }
    });

    setSineWave(data);
  }

  const playSineWave = () => {
    if (!sineWave) {
      return;
    }

    const buffer = audioContext.createBuffer(1, sineWave.length, MORSE_SAMPLE_RATE);
    buffer.copyToChannel(sineWave, 0);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
  };

  const downloadSineWave = () => {
    if (!sineWave) {
      return;
    }

    const wavData = convertToWav(sineWave);
    const blob = new Blob([wavData], { type: 'audio/wav' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'sine-wave.wav';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const convertToWav = (data: Float32Array<ArrayBuffer>) => {
    const numChannels = 1;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = MORSE_SAMPLE_RATE * blockAlign;
    const dataSize = data.length * bytesPerSample;
    const fileSize = 44 + dataSize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    // Chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, fileSize - 8, true);
    writeString(view, 8, 'WAVE');

    // Format sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // Audio format (PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, MORSE_SAMPLE_RATE, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true); // Bits per sample

    // Data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    floatTo16BitPCM(view, 44, data);

    return buffer;
  };

  const writeString = (view: DataView<ArrayBuffer>, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const floatTo16BitPCM = (view: DataView<ArrayBuffer>, offset: number, input: Float32Array<ArrayBuffer>) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  };

  const createMorseOscilator = () => {
    const oscillator = audioContext.createOscillator();
    // Defines the type of wave, other options: 'square', 'triangle', 'sawtooth'
    oscillator.type = 'sine';
    // Sets frequency in 600 Hz
    oscillator.frequency.value = MORSE_FREQUENCY_HZ;

    // Connects the oscillator to the gain node
    oscillator.connect(gainNode);
    // Connects the gain node to the output (speakers)
    gainNode.connect(audioContext.destination);

    return oscillator;
  };

  const playMorseAndWait = (text: string) => {
    if (text.length === 0) return;

    const duration = (MORSE_ELEMENT_TO_DURATION[text[0]] || 0) * MORSE_TIME_UNIT_MS;
    const oscillator = createMorseOscilator();
    
    if (['.', '-'].includes(text[0])) {
      // Starts the oscillator
      oscillator.start();
      // Stops the sound time specified in seconds (optional)
      oscillator.stop(audioContext.currentTime + ((duration) / 1000));
    }

    setTimeout(() => playMorseAndWait(text.slice(1, text.length)), duration + 100);
  }

  const handleNotFound = (notFound: string[], lang: string) => {
    if (notFound.length) {
      setError(`${lang} Character(s) Not Found: ${notFound.map(char => `${JSON.stringify(char)}`).join(', ')}`);
    } else {
      setError("");
    }
  };

  const translateLatinToMorse = (text: string) => {      
    const notFound: string[] = [];

    // text.normalize("NFKD") replaces special characters like accents by
    // their respective normalized versions (e.g. "é" by "e'"), plus escape
    // characters (e.g. line breaks by '\n').
    const letters = text.normalize("NFKD").split("");

    const morse = letters.map(l => {
      if (l === '') return null;

      const morseChar = LATIN_TO_MORSE[l.toUpperCase()];

      if (typeof morseChar === 'undefined' && !notFound.includes(l)) {
        notFound.push(l);
      }

      return morseChar;
    }).filter(l => l !== null && typeof l !== 'undefined')
      .join(" ")
      .replace(/\s\n\s/g, '\n');

    handleNotFound(notFound, "Latin");
    setMorseText(morse);
    generateSineWave(morse);
  };

  const translateMorseToLatin = (text: string) => {
    const notFound: string[] = [];
    const letters = text.replace(/_/g, "-").split(" ");

    const latin = letters.map(l => {
      if (l === '') return null;
      if (l === '/') return " ";
      
      const latinChar = MORSE_TO_LATIN[l];

      if (typeof latinChar === 'undefined' && !notFound.includes(l)) {
        notFound.push(l);
      }

      return latinChar;
    }).join("");

    handleNotFound(notFound, "Morse");
    setLatinText(latin);
  };

  return (
    <>
      <div className="flex gap-2 mb-2 w-[100%]">
        <div className="grow">
          <label htmlFor="latinField" className="text-left">
            <h2 className="text-2xl">Latin</h2>
          </label>
          <textarea
            name="latinField"
            id="latinField"
            value={latinText}
            rows={5}
            onChange={e => {
              const text = e.target.value;
              setLatinText(text);
              translateLatinToMorse(text);
            }}
            className="block p-2.5 w-full text-lg text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Type your Latin message here..."
          />
        </div>
        <div className="grow">
          <label htmlFor="morseField" className="text-left">
            <h2 className="text-2xl">Morse</h2>
          </label>
          <textarea
            name="morseField"
            id="morseField"
            value={morseText}
            rows={5}
            onChange={e => {
              const text = e.target.value;
              setMorseText(text);
              generateSineWave(text);
              translateMorseToLatin(text);
            }}
            className="block p-2.5 w-full text-lg text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Type your Morse message here..."
          />
        </div>
      </div>
      <div>
        <hr />
        <div className="text-red-900 error mt-2">{ error }</div>
      </div>
      <div className="text-right mt-2">
        <button
          className="rounded-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          onClick={() => {
            setLatinText("");
            setMorseText("");
            setSineWave(null);
          }}
          aria-label="Reset Input"
        >
          <FontAwesomeIcon icon="eraser" className="w-[20px] h-[20px]" />
        </button>
        {morseText && (
          <button
            className="ml-2 rounded-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            onClick={() => {
              playMorseAndWait(morseText.replace(/_/g, '-'))
            }}
            aria-label="Play Morse Code"
          >
            <FontAwesomeIcon icon="volume-high" className="w-[20px] h-[20px]" />
          </button>
        )}
        {sineWave && (
          <>
            <button
              className="ml-2 rounded-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              onClick={() => playSineWave()}
              aria-label="Play Wavefile"
            >
              <FontAwesomeIcon icon="play" className="w-[20px] h-[20px]" />
            </button>
            <button
              className="ml-2 rounded-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              onClick={() => downloadSineWave()}
              aria-label="Download Wavefile"
            >
              <FontAwesomeIcon icon="download" className="w-[20px] h-[20px]" />
            </button>
          </>
        )}
      </div>
    </>
  );
}

export default App
