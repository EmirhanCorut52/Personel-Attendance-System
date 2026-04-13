import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Alert } from "react-native";

import AddCourseScreen from "./screens/AddCourseScreen";
import AttendanceStatusScreen from "./screens/AttendanceStatusScreen";
import DailyScheduleScreen from "./screens/DailyScheduleScreen";
import {
  ATTENDANCE_ACTION_ABSENT,
  ATTENDANCE_ACTION_PRESENT,
  configureAttendanceNotificationsAsync,
  loadCoursesAsync,
  recordCourseAttendanceAsync,
  rescheduleAttendanceNotificationsAsync,
} from "./utils/courseAttendance";

const Tab = createBottomTabNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  useEffect(() => {
    let responseSubscription;

    const bootstrapNotifications = async () => {
      try {
        await configureAttendanceNotificationsAsync();

        const courses = await loadCoursesAsync();
        await rescheduleAttendanceNotificationsAsync(courses);

        responseSubscription =
          Notifications.addNotificationResponseReceivedListener(
            async (response) => {
              const courseId =
                response.notification.request.content.data?.courseId;

              if (!courseId) {
                return;
              }

              if (response.actionIdentifier === ATTENDANCE_ACTION_PRESENT) {
                await recordCourseAttendanceAsync(courseId, "present");
                Alert.alert(
                  "Yoklama kaydedildi",
                  "Derse katılımınız işaretlendi.",
                );
                return;
              }

              if (response.actionIdentifier === ATTENDANCE_ACTION_ABSENT) {
                const updatedCourse = await recordCourseAttendanceAsync(
                  courseId,
                  "absent",
                );

                if (
                  updatedCourse &&
                  Number(updatedCourse.missedHours) >
                    Number(updatedCourse.limit)
                ) {
                  Alert.alert(
                    "Dikkat",
                    `${updatedCourse.name} dersinde devamsızlık sınırını aşıyorsunuz.`,
                  );
                  return;
                }

                Alert.alert("Yoklama kaydedildi", "Devamsızlık işaretlendi.");
                return;
              }

              Alert.alert(
                response.notification.request.content.title || "Ders yoklaması",
                "Derse girdin mi?",
                [
                  {
                    text: "Girdim",
                    onPress: async () => {
                      await recordCourseAttendanceAsync(courseId, "present");
                      Alert.alert(
                        "Yoklama kaydedildi",
                        "Derse katılımınız işaretlendi.",
                      );
                    },
                  },
                  {
                    text: "Girmedim",
                    style: "destructive",
                    onPress: async () => {
                      const updatedCourse = await recordCourseAttendanceAsync(
                        courseId,
                        "absent",
                      );

                      if (
                        updatedCourse &&
                        Number(updatedCourse.missedHours) >
                          Number(updatedCourse.limit)
                      ) {
                        Alert.alert(
                          "Dikkat",
                          `${updatedCourse.name} dersinde devamsızlık sınırını aşıyorsunuz.`,
                        );
                        return;
                      }

                      Alert.alert(
                        "Yoklama kaydedildi",
                        "Devamsızlık işaretlendi.",
                      );
                    },
                  },
                ],
              );
            },
          );
      } catch (error) {
        console.error("Notification bootstrap error:", error);
      }
    };

    bootstrapNotifications();

    return () => {
      if (responseSubscription) {
        responseSubscription.remove();
      }
    };
  }, []);

  return (
    <NavigationContainer>
      <Tab.Navigator initialRouteName="Günlük Program">
        <Tab.Screen
          name="Ders Ekle"
          component={AddCourseScreen}
          options={{ title: "Ders Ekle" }}
        />
        <Tab.Screen
          name="Günlük Program"
          component={DailyScheduleScreen}
          options={{ title: "Ders Programım" }}
        />
        <Tab.Screen
          name="Durum Kontrol"
          component={AttendanceStatusScreen}
          options={{ title: "Devamsızlık Durumu" }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
