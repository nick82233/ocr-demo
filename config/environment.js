var environments = {

    staging: {
        FIREBASE_API_KEY: "AIzaSyBdRpAZIcMqQudsXmJ3JkFd9JtH67Ougt0",
        FIREBASE_AUTH_DOMAIN: "ocr-demo-e9ec5.firebaseapp.com",
        FIREBASE_DATABASE_URL: "https://ocr-demo-e9ec5.firebaseio.com",
        FIREBASE_PROJECT_ID: "ocr-demo-e9ec5",
        FIREBASE_STORAGE_BUCKET: "ocr-demo-e9ec5.appspot.com",
        FIREBASE_MESSAGING_SENDER_ID: "368663533081",
        GOOGLE_CLOUD_VISION_API_KEY: "AIzaSyBky3Z-v9zPtB70AJjJVl2SDzIz6PFbDp8"
    },
    production: {
        // Warning: This file still gets included in your native binary and is not a secure way to store secrets if you build for the app stores.
        // Details: https://github.com/expo/expo/issues/83
    }
};
function getReleaseChannel() {
    let releaseChannel = Expo.Constants.manifest.releaseChannel;
    if (releaseChannel === undefined) {
        return "staging";
    } else if (releaseChannel === "staging") {
        return "staging";
    } else {
        return "staging";
    }
}
function getEnvironment(env) {
    console.log("Release Channel: ", getReleaseChannel());
    return environments[env];
}
var Environment = getEnvironment(getReleaseChannel());
export default Environment;