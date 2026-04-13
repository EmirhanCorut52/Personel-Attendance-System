import { useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  WEEKDAY_OPTIONS,
  getCourseDayLabel,
  isValidTimeValue,
  loadCoursesAsync,
  rescheduleAttendanceNotificationsAsync,
  saveCoursesAsync,
} from "../utils/courseAttendance";

export default function AddCourseScreen() {
  const [courseName, setCourseName] = useState("");
  const [weeklyHours, setWeeklyHours] = useState("");
  const [absenceLimit, setAbsenceLimit] = useState("");
  const [selectedDay, setSelectedDay] = useState(null);
  const [startTime, setStartTime] = useState("");

  const handleSaveCourse = async () => {
    if (
      !courseName ||
      !weeklyHours ||
      !absenceLimit ||
      selectedDay === null ||
      !startTime
    ) {
      Alert.alert("Hata", "Lütfen tüm alanları doldurun.");
      return;
    }

    if (!isValidTimeValue(startTime)) {
      Alert.alert("Hata", "Lütfen saati HH:MM formatında girin.");
      return;
    }

    const parsedWeeklyHours = Number(weeklyHours);
    const parsedAbsenceLimit = Number(absenceLimit);

    if (Number.isNaN(parsedWeeklyHours) || Number.isNaN(parsedAbsenceLimit)) {
      Alert.alert("Hata", "Saat alanlarına geçerli sayılar girin.");
      return;
    }

    const newCourse = {
      id: Date.now().toString(),
      name: courseName,
      hours: parsedWeeklyHours,
      limit: parsedAbsenceLimit,
      missedHours: 0,
      dayOfWeek: selectedDay,
      startTime,
    };

    try {
      const existingCourses = await loadCoursesAsync();

      const updatedCourses = [...existingCourses, newCourse];
      await saveCoursesAsync(updatedCourses);
      await rescheduleAttendanceNotificationsAsync(updatedCourses);

      Alert.alert("Başarılı", `${courseName} dersi başarıyla eklendi!`);
      setCourseName("");
      setWeeklyHours("");
      setAbsenceLimit("");
      setSelectedDay(null);
      setStartTime("");

      Keyboard.dismiss();
    } catch (error) {
      Alert.alert("Hata", "Ders kaydedilirken bir sorun oluştu.");
      console.error("Save error:", error);
    }
  };

  const formContent = (
    <ScrollView
      contentContainerStyle={styles.innerContainer}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.headerTitle}>Yeni Ders Ekle</Text>
      <Text style={styles.helperText}>
        Ders gününü ve başlangıç saatini seçtiğinizde yoklama o vakitte otomatik
        sorulur.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Ders Adı</Text>
        <TextInput
          style={styles.input}
          value={courseName}
          onChangeText={setCourseName}
          autoComplete="off"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Ders Günü</Text>
        <View style={styles.dayList}>
          {WEEKDAY_OPTIONS.map((dayOption) => (
            <TouchableOpacity
              key={dayOption.value}
              style={[
                styles.dayChip,
                selectedDay === dayOption.value && styles.dayChipSelected,
              ]}
              onPress={() => setSelectedDay(dayOption.value)}
            >
              <Text
                style={[
                  styles.dayChipText,
                  selectedDay === dayOption.value && styles.dayChipTextSelected,
                ]}
              >
                {dayOption.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Başlangıç Saati</Text>
        <TextInput
          style={styles.input}
          value={startTime}
          onChangeText={setStartTime}
          autoComplete="off"
        />
        <Text style={styles.fieldHint}>24 saat formatında HH:MM girin.</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Haftalık Saat</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={weeklyHours}
          onChangeText={setWeeklyHours}
          autoComplete="off"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Devamsızlık Sınırı (Saat)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={absenceLimit}
          onChangeText={setAbsenceLimit}
          autoComplete="off"
        />
      </View>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>Program Özeti</Text>
        <Text style={styles.summaryText} numberOfLines={1} ellipsizeMode="tail">
          {`${selectedDay === null ? "Gün seçilmedi" : getCourseDayLabel({ dayOfWeek: selectedDay })} | Saat: ${startTime || "-"} | Haftalık: ${weeklyHours || "-"} | Sınır: ${absenceLimit || "-"}`}
        </Text>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSaveCourse}>
        <Text style={styles.saveButtonText}>Dersi Kaydet</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {Platform.OS === "web" ? (
        formContent
      ) : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>{formContent}</View>
        </TouchableWithoutFeedback>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  innerContainer: {
    padding: 20,
    marginTop: 20,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
    textAlign: "center",
  },
  helperText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: "#555",
    fontWeight: "600",
  },
  fieldHint: {
    marginTop: 6,
    color: "#777",
    fontSize: 12,
  },
  dayList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    columnGap: 8,
    rowGap: 10,
  },
  dayChip: {
    width: "31%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d6d6d6",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  dayChipSelected: {
    backgroundColor: "#0f766e",
    borderColor: "#0f766e",
  },
  dayChipText: {
    color: "#333",
    fontSize: 13,
    fontWeight: "600",
  },
  dayChipTextSelected: {
    color: "#fff",
  },
  summaryBox: {
    backgroundColor: "#eef7f6",
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#d0ebe8",
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f766e",
    marginBottom: 8,
  },
  summaryText: {
    color: "#355a58",
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
