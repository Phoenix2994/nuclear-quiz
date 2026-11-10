# nuclear-quiz (sorgente)

Unofficial fan-made quiz app. Not affiliated with Bethesda Softworks, ZeniMax Media or Microsoft. Fallout and related trademarks belong to their owners. Entry texts come from the Fallout Wiki (CC BY-SA 3.0).

Questo branch contiene il **sorgente** (React 18 + Vite + TypeScript). Il sito pubblicato (GitHub Pages) sta su `main` e non viene toccato.

## Comandi
- `npm ci` - installa le dipendenze
- `npm run dev` - server di sviluppo
- `npm test` - test (Vitest)
- `npm run build` - typecheck + build in `dist/`

`public/data` (JSON) e `public/img` (immagini) sono serviti come asset statici.

## App Android (Capacitor)
Id: `com.phoenix2994.wastelandquiz` - minSdk 22, targetSdk 34.

- `npm run android:debug` - build web + sync + APK in `android/app/build/outputs/apk/debug/app-debug.apk` (richiede JDK 17+ e Android SDK, `ANDROID_HOME`)
- `npm run assets` - rigenera icone e splash da `assets/` (trifoglio originale)
- Su GitHub, l'azione **Android APK** produce l'APK come artifact a ogni push.

**Firma release (non e in git):** crea un keystore e `android/keystore.properties` con `storeFile`, `storePassword`, `keyAlias`, `keyPassword`:
`keytool -genkeypair -v -keystore wq.keystore -alias wq -keyalg RSA -keysize 2048 -validity 10000`
poi `npm run android:release` (APK + AAB). Conserva il keystore: serve per ogni aggiornamento.

**Nativo:** progressi salvati in localStorage e duplicati in SharedPreferences (`src/native.ts`, con ripristino); tasto indietro (da un'altra scheda torna al quiz, dal quiz esce); aptica su risposta giusta/sbagliata.

**Asset di terzi:** suoni in `public/sounds`; le immagini del wiki sono ancora in hotlink e passano da `img()` in `src/assets.ts` (`IMG_OVERRIDES`) per poterle sostituire prima di un eventuale rilascio negli store.
