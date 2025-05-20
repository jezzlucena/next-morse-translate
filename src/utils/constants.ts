import { invert } from "lodash"

export const MORSE_FREQUENCY_HZ: number = 600;
export const MORSE_TIME_UNIT_MS: number = 100;
export const MORSE_ELEMENT_TO_DURATION: { [key: string]: number } = {
  '.': 1,
  '/': 1,
  '-': 3,
  ' ': 3,
  '\n': 10
};

export const LATIN_TO_MORSE: { [key: string]: string } = {
  'A': '.-',    'B': '-...',  'C': '-.-.',  'D': '-..',   'E': '.',
  'F': '..-.',  'G': '--.',   'H': '....',  'I': '..',    'J': '.---',
  'K': '-.-',   'L': '.-..',  'M': '--',    'N': '-.',    'O': '---',
  'P': '.--.',  'Q': '--.-',  'R': '.-.',   'S': '...',   'T': '-',
  'U': '..-',   'V': '...-',  'W': '.--',   'X': '-..-',  'Y': '-.--',
  'Z': '--..',  '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.', 
  '0': '-----', ',': '--..--', '.': '.-.-.-', '?': '..--..',
  '/': '-..-.', '-': '-....-', '(': '-.--.', ')': '-.--.-', 
  '\n': '\n', ' ': '/'
};

export const MORSE_TO_LATIN = invert(LATIN_TO_MORSE);