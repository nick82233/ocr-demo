import React from "react";
import {
    ActivityIndicator,
    Button,
    Clipboard,
    FlatList,
    Image,
    Platform,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    ScrollView,
    View
} from "react-native";

import {Constants} from "expo";
import * as ImagePicker from 'expo-image-picker';
import * as Permissions from 'expo-permissions';
import * as ImageManipulator from 'expo-image-manipulator';
import uuid from "uuid";
import Environment from "../config/environment";
import firebase from "../utils/firebase";
import '@firebase/firestore';

console.disableYellowBox = true;

export default class App extends React.Component {
    static navigationOptions = {
        title: 'OCR Demo',
    };

    state = {
        image: null,
        uploading: false,
        googleResponse: null
    };

    async componentDidMount() {
        await Permissions.askAsync(Permissions.CAMERA_ROLL);
        await Permissions.askAsync(Permissions.CAMERA);
    }

    render() {
        let {image} = this.state;

        return (

            <View style={styles.container}>
                <ScrollView
                    style={styles.container}
                    contentContainerStyle={styles.contentContainer}
                >

                    <View style={{margin: 10}}>
                        <Button
                            onPress={this._pickImage}
                            title="CHOOSE FROM LIBRARY"
                        />
                    </View>

                    <View style={{margin: 10}}>
                        <Button style={{padding: 10}} onPress={this._takePhoto} title="TAKE A PHOTO"/>
                    </View>
                    {this._maybeRenderImage()}
                    {this._maybeRenderUploadingOverlay()}

                </ScrollView>
            </View>
        );
    }

    organize = array => {
        return array.map(function (item, i) {
            return (
                <View key={i}>
                    <Text>{item}</Text>
                </View>
            );
        });
    };

    _maybeRenderUploadingOverlay = () => {
        if (this.state.uploading) {
            return (
                <View
                    style={[
                        StyleSheet.absoluteFill,
                        {
                            backgroundColor: "rgba(0,0,0,0.4)",
                            alignItems: "center",
                            justifyContent: "center"
                        }
                    ]}
                >
                    <ActivityIndicator color="#fff" animating size="large"/>
                </View>
            );
        }
    };

    _maybeRenderImage = () => {
        let {image, googleResponse} = this.state;
        if (!image) {
            return;
        }

        return (
            <View style={styles.resultContainer}>
                <Button
                    style={{marginBottom: 10}}
                    onPress={() => this.submitToGoogle()}
                    title="Submit"/>
                <View
                    style={styles.imageContainer}>
                    <Image source={{uri: image}} style={{width: 400, height: 400}} resizeMode="contain"/>
                </View>

                <View style={{marginTop: 20}}/>

                {googleResponse && (
                    <Text style={styles.resultText}>
                        {googleResponse.responses[0].textAnnotations[0].description}
                    </Text>
                )}

                <View style={{marginTop: 20}}/>

                { googleResponse && (

                    <Text
                        onPress={this._copyToClipboard}
                        onLongPress={this._share}
                        style={styles.rawJsonText}
                    >
                        {'Raw JSON:\n' + JSON.stringify(googleResponse.responses)}
                    </Text>
                )}
            </View>
        );
    };

    _keyExtractor = (item, index) => item.id;

    _renderItem = item => {
        <Text>response: {JSON.stringify(item)}</Text>;
    };

    _share = () => {
        Share.share({
            message: JSON.stringify(this.state.googleResponse.responses),
            title: "Check it out",
            url: this.state.image
        });
    };

    _copyToClipboard = () => {
        Clipboard.setString(this.state.image);
        alert("Copied to clipboard");
    };

    _takePhoto = async () => {
        let pickerResult = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            // aspect: [4, 3]
        });

        let photoFileNew = await ImageManipulator.manipulateAsync(
            pickerResult.uri,
            [{resize: {width: 768}}],
            {format: 'jpeg', base64: true},
        );

        this._handleImagePicked(photoFileNew);
    };

    _pickImage = async () => {
        let pickerResult = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            // aspect: [4, 3]
        });


        let photoFileNew = await ImageManipulator.manipulateAsync(
            pickerResult.uri,
            [{resize: {width: 768}}],
            {format: 'jpeg', base64: true},
        );

        this._handleImagePicked(photoFileNew);
    };

    _handleImagePicked = async pickerResult => {
        try {
            this.setState({uploading: true});

            if (!pickerResult.cancelled) {
                uploadUrl = await uploadImageAsync(pickerResult.uri);
                this.setState({image: uploadUrl});
            }
        } catch (e) {
            console.log(e);
            alert("Upload failed, sorry :(");
        } finally {
            this.setState({uploading: false});
        }
    };

    submitToGoogle = async () => {
        try {
            this.setState({uploading: true});
            let {image} = this.state;
            let body = JSON.stringify({
                requests: [
                    {
                        features: [
// { type: "LABEL_DETECTION", maxResults: 10 },
// { type: "LANDMARK_DETECTION", maxResults: 5 },
// { type: "FACE_DETECTION", maxResults: 5 },
// { type: "LOGO_DETECTION", maxResults: 5 },
                            {type: "TEXT_DETECTION", maxResults: 5},
                            {type: "DOCUMENT_TEXT_DETECTION", maxResults: 5},
// { type: "SAFE_SEARCH_DETECTION", maxResults: 5 },
// { type: "IMAGE_PROPERTIES", maxResults: 5 },
// { type: "CROP_HINTS", maxResults: 5 },
// { type: "WEB_DETECTION", maxResults: 5 }
                        ],
                        image: {
                            source: {
                                imageUri: image
                            }
                        }
                    }
                ]
            });
            let response = await fetch(
                "https://vision.googleapis.com/v1/images:annotate?key=" +
                Environment["GOOGLE_CLOUD_VISION_API_KEY"],
                {
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json"
                    },
                    method: "POST",
                    body: body
                }
            );
            let responseJson = await response.json();
            console.log('body:' + body);
            console.log(responseJson);
            if (responseJson && responseJson.responses[0].textAnnotations) {
                console.log('textAnnotations= true saving result')
                // FIXME: dirty way to extract result
                let result = {
                    imageUrl: image,
                    result: responseJson.responses[0].textAnnotations[0].description,
                    rawJson: responseJson.responses[0].textAnnotations[0]
                }
                await saveOcrResultAsync(result)

            } else {
                console.log('textAnnotations= false')
            }

            this.setState({
                googleResponse: responseJson,
                uploading: false
            });

        } catch (error) {
            console.log(error);
        }
    };
}

async function saveOcrResultAsync(response) {
    const db = firebase
        .firestore()
    db.collection("ocr").add(response)
        .then(function (docRef) {
            console.log("Document written with ID: ", docRef.id);
        })
        .catch(function (error) {
            console.error("Error adding document: ", error);
        });
}

async function uploadImageAsync(uri) {
    const blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
            resolve(xhr.response);
        };
        xhr.onerror = function (e) {
            console.log(e);
            reject(new TypeError("Network request failed"));
        };
        xhr.responseType = "blob";
        xhr.open("GET", uri, true);
        xhr.send(null);
    });

    const ref = firebase
        .storage()
        .ref()
        .child(uuid.v4());
    const snapshot = await ref.put(blob);

    blob.close();

    return await snapshot.ref.getDownloadURL();
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        paddingBottom: 10
    },
    contentContainer: {
        paddingTop: 10
    },
    resultContainer: {
        margin: 10,
        borderRadius: 3,
        elevation: 2,
        textAlign: "center"
    },
    imageContainer: {
        borderTopRightRadius: 3,
        borderTopLeftRadius: 3,
        shadowColor: "rgba(0,0,0,1)",
        shadowOpacity: 0.2,
        shadowOffset: {width: 4, height: 4},
        shadowRadius: 5,
        overflow: "hidden",
        textAlign: "center"
    },
    resultText: {
        paddingVertical: 10,
        paddingHorizontal: 10,
        fontSize: 20
    },
    rawJsonText: {
        paddingVertical: 10,
        paddingHorizontal: 10,
    }
});
