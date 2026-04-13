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
  loadCoursesAsync,
  rescheduleAttendanceNotificationsAsync,
  saveCoursesAsync,
  sortCoursesBySchedule,
} from "../utils/courseAttendance";

export default function AttendanceStatusScreen() {
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

  const handleDeleteCourse = (courseId, courseName) => {
    Alert.alert(
      "Dersi Sil",
      `"${courseName}" dersini silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve tüm devamsızlık kayıtları silinir.`,
      [
        {
          text: "İptal",
          style: "cancel",
        },
        {
          text: "Evet, Sil",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedCourses = courses.filter(
                (course) => course.id !== courseId,
              );

              setCourses(updatedCourses);

              await saveCoursesAsync(updatedCourses);
              await rescheduleAttendanceNotificationsAsync(updatedCourses);
            } catch (error) {
              console.error("Error deleting course:", error);
              Alert.alert("Hata", "Ders silinirken bir sorun oluştu.");
            }
          },
        },
      ],
    );
  };

  const renderCourseItem = ({ item }) => {
    const remainingHours = item.limit - item.missedHours;

    return (
      <View style={styles.card}>
        {/* Başlık ve Silme Butonunu yan yana almak için yeni bir View içine aldık */}
        <View style={styles.cardHeader}>
          <Text style={styles.courseName}>{item.name}</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteCourse(item.id, item.name)}
          >
            <Text style={styles.deleteButtonText}>Sil</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Program</Text>
            <Text style={styles.statValue}>{getCourseScheduleLabel(item)}</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Limit</Text>
            <Text style={styles.statValue}>{item.limit} Saat</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Yapılan Devamsızlık</Text>
            <Text style={[styles.statValue, { color: "#e74c3c" }]}>
              {item.missedHours} Saat
            </Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Kalan</Text>
            <Text
              style={[
                styles.statValue,
                { color: remainingHours <= 3 ? "#e74c3c" : "#2ecc71" },
              ]}
            >
              {remainingHours} Saat
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {courses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Henüz hiç ders eklemediniz.</Text>
          <Text style={styles.emptySubText}>
            Ders Ekle sekmesinden yeni dersler oluşturabilirsiniz.
          </Text>
        </View>
      ) : (
        <FlatList
          data={courses}
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  deleteButton: {
    backgroundColor: "#ffdddd",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  deleteButtonText: {
    color: "#e74c3c",
    fontSize: 12,
    fontWeight: "bold",
  },
  courseName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: "#eee",
    paddingTop: 10,
  },
  statBox: {
    alignItems: "center",
    width: "50%",
    paddingHorizontal: 6,
    marginBottom: 14,
  },
  statLabel: {
    fontSize: 12,
    color: "#777",
    marginBottom: 5,
    textAlign: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
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
  },
  emptySubText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
  },
});
