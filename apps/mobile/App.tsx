import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <Text style={styles.eyebrow}>Hinora Mobile</Text>
        <Text style={styles.title}>Enterprise AI Policy System</Text>
        <Text style={styles.description}>
          Read policies, listen to policy content, complete post-tests, and keep
          certificates available on mobile.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  eyebrow: {
    marginBottom: 12,
    color: "#165dff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    marginBottom: 16,
    color: "#111827",
    fontSize: 32,
    fontWeight: "700",
  },
  description: {
    color: "#5b6472",
    fontSize: 16,
    lineHeight: 24,
  },
});
