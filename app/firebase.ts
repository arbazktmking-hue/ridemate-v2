import { initializeApp } from "firebase/app";

import {
  getAuth
} from "firebase/auth";

import {
  getFirestore
} from "firebase/firestore";

const firebaseConfig = {

  apiKey: "AIzaSyAXFb4EBELGME4cgvZE0u-oLhWb1BemyXU",

  authDomain: "ridematev2-46587.firebaseapp.com",

  projectId: "ridematev2-46587",

  storageBucket: "ridematev2-46587.firebasestorage.app",

  messagingSenderId: "329839335892",

  appId: "1:329839335892:web:a7c42234f93dbcac3f9e41",

  measurementId: "G-6WBBMYB93J"

};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);