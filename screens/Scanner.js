import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  Button,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
} from "react-native";
import { CameraView, Camera } from "expo-camera";

export default function Scanner({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [access, setAccess] = useState(false);
  const [accessmsg, setAccessMsg] = useState([]);

  const [animation] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(animation, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animation]);

  const scanLineStyle = {
    transform: [
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [-50, 50],
        }),
      },
    ],
  };

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };

    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    try {
      const parsedData = JSON.parse(data);
      setScannedData(parsedData);
      sendScannedDataToAPI(parsedData);
    } catch (error) {
      setAccessMsg([
        { auth: "404 Network Error" },
        { message: "Session Expired! please restart and try again!" },
      ]);
    }
  };

  if (hasPermission === null) {
    return <Text>Requesting for camera permission</Text>;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  const convertTimeTo24Hour = (time) => {
    const [timePart, modifier] = time.split(" ");
    let [hours, minutes] = timePart.split(":").map(Number);
    if (modifier === "PM" && hours !== 12) {
      hours += 12;
    } else if (modifier === "AM" && hours === 12) {
      hours = 0;
    }

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    return date;
  };

  const sendScannedDataToAPI = async (data) => {
    try {
      const apiURL = `https://sports1.gitam.edu/slot/gym/getAdminSlots/${data.regdNo}/${data.start_time}`;

      const response = await fetch(apiURL, {
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorMessage =
          response.status === 404 ? "No slots found" : "Failed to fetch slots";
        setAccess(false);
        setAccessMsg([{ auth: "Access Denied" }, { message: errorMessage }]);
        return;
      }

      const slots = await response.json();
      const currentTime = new Date();
      const match = slots.find((slot) => {
        const slotStart = convertTimeTo24Hour(slot.start_time);
        const slotEnd = convertTimeTo24Hour(slot.end_time);
        return currentTime >= slotStart && currentTime <= slotEnd;
      });

      if (match) {
        UpdateAttendance(slots[0]).then(() => {
          setAccess(true);
          setAccessMsg([
            { auth: "Access Granted" },
            {
              message:
                "Welcome to Gitam Gym! Please follow rules and regulations!",
            },
          ]);
        });
      } else {
        setAccess(false);
        setAccessMsg([
          { auth: "Access Denied" },
          { message: "No matching slot found" },
        ]);
      }
    } catch (error) {
      console.error("Error sending scanned data to API:", error);
      setAccess(false);
      setAccessMsg([
        { auth: "Access Denied" },
        { message: "An error occurred" },
      ]);
    }
  };

  const UpdateAttendance = async (dataToPost) => {
    try {
      const response = await fetch(
        "https://sports1.gitam.edu/api/gym/updateGymSchedule",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            regdNo: dataToPost.regdNo,
            start_time: dataToPost.start_time,
            start_date: dataToPost.start_date,
            id: dataToPost.id,
            masterID: dataToPost.masterID,
          }),
        }
      );
      const result = await response.json();

      if (response.status === 200) {
        setAccess(true);
        setAccessMsg([
          { auth: "Access Granted" },
          {
            message:
              "Welcome to Gitam Gym! Please follow rules and regulations!",
          },
        ]);
      } else if (response.status === 400 || response.status === 404) {
        setAccess(false);
        setAccessMsg([
          { auth: "Access Denied" },
          { message: result.message || "An error occurred" },
        ]);
      }
    } catch (error) {
      setAccess(false);
      setAccessMsg([
        { auth: "Access Denied" },
        { message: result.message || "Failed to update attendance" },
      ]);
    }
  };

  const stateRefresh = () => {
    setAccess(false);
    setScanned(false);
    setScannedData(null);
    setAccessMsg([]);
  };

  return (
    <View style={styles.container}>
      <CameraView
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "pdf417"],
        }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.overlay}>
        <Animated.View style={[styles.scanLine, scanLineStyle]} />
      </View>

      <View style={styles.buttonContainer}>
        <View style={styles.innerButtonContainer}>
          {scanned && (
            <TouchableWithoutFeedback>
              <>
                <View style={styles.modalHeader}>
                  {accessmsg.map((msg, index) => (
                    <View key={index} style={styles.textContainer}>
                      <Text style={access ? styles.granted : styles.denied}>
                        {access !== null && msg?.auth}
                      </Text>
                      <Text
                        style={
                          access ? styles.messageText : styles.errormessage
                        }
                      >
                        {access !== null && msg?.message}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.modalContent}>
                  <View style={styles.modalBody}>
                    {scannedData && (
                      <>
                        <View style={styles.modalRow}>
                          <Text style={styles.modalLabel}>Regd No:</Text>
                          <Text style={styles.modalValue}>
                            {scannedData.regdNo}
                          </Text>
                        </View>
                        <View style={styles.modalRow}>
                          <Text style={styles.modalLabel}>Slot:</Text>
                          <Text style={styles.modalValue}>
                            {scannedData.start_time} - {scannedData.end_time}
                          </Text>
                        </View>
                        <View style={styles.modalRow}>
                          <Text style={styles.modalLabel}>Campus:</Text>
                          <Text style={styles.modalValue}>
                            {scannedData.campus}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              </>
            </TouchableWithoutFeedback>
          )}
          <TouchableOpacity style={styles.button} onPress={stateRefresh}>
            <Text style={styles.buttonText}>Tap to Scan Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
  },
  overlay: {
    position: "absolute",
    top: "20%",
    left: "10%",
    right: "10%",
    height: 300,
    borderColor: "#fff",
    borderWidth: 2,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  scanLine: {
    width: "100%",
    height: 2,
    backgroundColor: "#007367",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    alignSelf: "center",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  buttonText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    marginRight: 10,
  },
  innerButtonContainer: {
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  modalBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    width: "100%",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeader: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },
  textContainer: {
    paddingLeft: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  granted: {
    textAlign: "center",
    color: "#28a745",
    fontSize: 24,
    fontWeight: "bold",
    alignItems: "center",
    justifyContent: "center",
  },
  denied: {
    textAlign: "center",
    color: "#dc3545",
    fontSize: 24,
    fontWeight: "bold",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    marginBottom: 20,
    width: "100%",
  },
  modalRow: {
    flexDirection: "row",
    marginBottom: 10,
    alignItems: "center",
  },
  modalLabel: {
    fontSize: 20,
    fontWeight: "600",
    alignItems: "center",
  },
  modalValue: {
    fontSize: 16,
    fontWeight: "500",
    alignItems: "center",
    marginLeft: 5,
  },

  button: {
    backgroundColor: "#007367",
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderRadius: 5,
    alignItems: "center",
    marginHorizontal: 5,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  messageText: {
    fontSize: 18,
    margin: 0,
    fontWeight: "600",
    color: "#007367",
  },
  errormessage: {
    fontSize: 18,
    margin: 0,
    fontWeight: "600",
    color: "#dc3545",
  },
});
