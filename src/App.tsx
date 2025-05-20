import { useState } from 'react'
import './App.css'
import {
  LATIN_TO_MORSE,
  MORSE_ELEMENT_TO_DURATION,
  MORSE_FREQUENCY_HZ,
  MORSE_TIME_UNIT_MS,
  MORSE_TO_LATIN
} from './utils/constants';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function App() {
  const [latinText, setLatinText] = useState("");
  const [morseText, setMorseText] = useState("");
  const [error, setError] = useState<string>();

  const audioContext = new AudioContext();
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0.2; // Adjusts the volume

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
      oscillator.stop(audioContext.currentTime + ((duration - 50) / 1000));
    }

    setTimeout(() => playMorseAndWait(text.slice(1, text.length)), duration);
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
          className="border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          onClick={() => {
            setLatinText("");
            setMorseText("");
          }}
          aria-label="Reset Input"
        >
          <FontAwesomeIcon icon="eraser" />
        </button>
        {morseText && (
          <button
            className="border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            onClick={() => {
              playMorseAndWait(morseText.replace(/_/g, '-'))
            }}
            aria-label="Play Morse Code"
          >
            <FontAwesomeIcon icon="volume-high" />
          </button>
        )}
      </div>
    </>
  );
}

export default App
