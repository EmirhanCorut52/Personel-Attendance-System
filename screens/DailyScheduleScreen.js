import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  getCourseScheduleLabel,
  getPendingCoursesForDate,
  getScheduledCoursesForDate,
  isCourseActiveNow,
  loadCoursesAsync,
  recordCourseAttendanceAsync,
  sortCoursesBySchedule,
} from "../utils/courseAttendance";

export default function DailyScheduleScreen() {
  const [courses, setCourses] = useState([]);

  const loadCourses = async () => {
    try {
      const storedCourses = await loadCoursesAsync();
      setCourses(sortCoursesBySchedule(storedCourses));
    } catch (error) {
      console.error("Error loading courses:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCourses();
    }, []),
  );

  const handleAttendance = async (courseId, status) => {
    try {
      const updatedCourse = await recordCourseAttendanceAsync(courseId, status);
      await loadCourses();

      if (
        status === "absent" &&
        updatedCourse &&
        Number(updatedCourse.missedHours) > Number(updatedCourse.limit)
      ) {
        Alert.alert(
          "Dikkat!",
          `${updatedCourse.name} dersinden devamsızlıktan kalıyorsunuz!`,
        );
      }

      const message =
        status === "absent"
          ? "Devamsızlık işlendi."
          : "Derse katılımınız kaydedildi.";

      Alert.alert("Başarılı", message);
    } catch (error) {
      console.error("Error updating attendance:", error);
      Alert.alert("Hata", "Yoklama kaydedilirken bir sorun oluştu.");
    }
  };

  const renderCourseItem = ({ item }) => {
    const activeNow = isCourseActiveNow(item);

    return (
      <View style={styles.card}>
        <View style={styles.courseInfo}>
          <Text style={styles.courseName}>{item.name}</Text>
          <Text style={styles.courseDetails}>
            {getCourseScheduleLabel(item)} | Süre: {item.hours} Saat | Sınır:{" "}
            {item.limit} Saat
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text
            style={[
              styles.statusBadge,
              activeNow ? styles.statusBadgeActive : styles.statusBadgeIdle,
            ]}
          >
            {activeNow ? "Yoklama açık" : "Bekleyen ders"}
          </Text>
        </View>

        <Text style={styles.questionText}>
          {activeNow
            ? "Derse girdin mi?"
            : "Ders saati geldiğinde burada yoklama sorulacak."}
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.presentButton,
              !activeNow && styles.buttonDisabled,
            ]}
            disabled={!activeNow}
            onPress={() => handleAttendance(item.id, "present")}
          >
            <Text style={styles.buttonText}>Evet (Girdim)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.absentButton,
              !activeNow && styles.buttonDisabled,
            ]}
            disabled={!activeNow}
            onPress={() => handleAttendance(item.id, "absent")}
          >
            <Text style={styles.buttonText}>Hayır (Girmedim)</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {getPendingCoursesForDate(courses).length === 0 ? (
        <View style={styles.emptyContainer}>
          {(() => {
            const noScheduledCourses =
              getScheduledCoursesForDate(courses).length === 0;

            return (
              <>
                <Text style={styles.emptyText}>
                  {noScheduledCourses
                    ? "Bugün için planlanmış ders bulunamadı."
                    : "Bugünkü derslerin yoklaması tamamlandı."}
                </Text>
                {noScheduledCourses ? (
                  <Text style={styles.emptySubText}>
                    Ders Ekle sekmesinden haftalık programınızı tanımlayın.
                  </Text>
                ) : null}
              </>
            );
          })()}
        </View>
      ) : (
        <FlatList
          data={getPendingCoursesForDate(courses)}
          keyExtractor={(item) => item.id}
          renderItem={renderCourseItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  listContainer: {
    padding: 15,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  courseInfo: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 10,
  },
  courseName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  courseDetails: {
    fontSize: 14,
    color: "#666",
  },
  statusRow: {
    marginBottom: 10,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
  },
  statusBadgeActive: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  statusBadgeIdle: {
    backgroundColor: "#e5e7eb",
    color: "#374151",
  },
  questionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#444",
    textAlign: "center",
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  presentButton: {
    backgroundColor: "#2ecc71",
  },
  absentButton: {
    backgroundColor: "#e74c3c",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: "#555",
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    width: "100%",
  },
  emptySubText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
  },
});
