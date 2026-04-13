import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const COURSE_STORAGE_KEY = "@courses";
export const ATTENDANCE_NOTIFICATION_CATEGORY = "attendance-reminder";
export const ATTENDANCE_ACTION_PRESENT = "mark-present";
export const ATTENDANCE_ACTION_ABSENT = "mark-absent";
export const ATTENDANCE_CHANNEL_ID = "attendance-reminder";

export const WEEKDAY_LABELS = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
];

export const WEEKDAY_OPTIONS = WEEKDAY_LABELS.map((label, value) => ({
  label,
  value: value + 1,
}));

const WEEKDAY_LABEL_BY_VALUE = WEEKDAY_OPTIONS.reduce((accumulator, option) => {
  accumulator[option.value] = option.label;
  return accumulator;
}, {});

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const parseTimeValue = (timeValue) => {
  const normalizedTime = typeof timeValue === "string" ? timeValue.trim() : "";

  if (!TIME_PATTERN.test(normalizedTime)) {
    return null;
  }

  const [hour, minute] = normalizedTime
    .split(":")
    .map((value) => Number(value));

  return { hour, minute };
};

const getDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const isValidTimeValue = (timeValue) =>
  TIME_PATTERN.test((timeValue || "").trim());

export const getCourseDayLabel = (course) => {
  if (typeof course?.dayOfWeek !== "number") {
    return "Belirlenmedi";
  }

  return WEEKDAY_LABEL_BY_VALUE[course.dayOfWeek] || "Belirlenmedi";
};

export const getCourseScheduleLabel = (course) => {
  const dayLabel = getCourseDayLabel(course);
  const startTime = course?.startTime || "Belirlenmedi";

  return `${dayLabel} - ${startTime}`;
};

export const sortCoursesBySchedule = (courses) => {
  return [...courses].sort((leftCourse, rightCourse) => {
    const leftDay =
      typeof leftCourse.dayOfWeek === "number" ? leftCourse.dayOfWeek : 99;
    const rightDay =
      typeof rightCourse.dayOfWeek === "number" ? rightCourse.dayOfWeek : 99;

    if (leftDay !== rightDay) {
      return leftDay - rightDay;
    }

    return (leftCourse.startTime || "").localeCompare(
      rightCourse.startTime || "",
    );
  });
};

export const getScheduledCoursesForDate = (courses, date = new Date()) => {
  return sortCoursesBySchedule(courses).filter(
    (course) => course.dayOfWeek === date.getDay(),
  );
};

export const getActiveCoursesForDate = (courses, date = new Date()) => {
  return getScheduledCoursesForDate(courses, date).filter((course) =>
    isCourseActiveNow(course, date),
  );
};

export const isAttendanceMarkedForDate = (course, date = new Date()) => {
  return course?.lastAttendanceDateKey === getDateKey(date);
};

export const getPendingCoursesForDate = (courses, date = new Date()) => {
  return getScheduledCoursesForDate(courses, date).filter(
    (course) => !isAttendanceMarkedForDate(course, date),
  );
};

export const isCourseActiveNow = (course, date = new Date()) => {
  if (
    typeof course?.dayOfWeek !== "number" ||
    !isValidTimeValue(course.startTime)
  ) {
    return false;
  }

  if (date.getDay() !== course.dayOfWeek) {
    return false;
  }

  const parsedTime = parseTimeValue(course.startTime);

  if (!parsedTime) {
    return false;
  }

  const courseStart = new Date(date);
  courseStart.setSeconds(0, 0);
  courseStart.setHours(parsedTime.hour, parsedTime.minute, 0, 0);

  const durationHours = Number(course.hours) || 1;
  const courseEnd = new Date(courseStart);
  courseEnd.setMinutes(courseEnd.getMinutes() + durationHours * 60);

  return date >= courseStart && date <= courseEnd;
};

export const buildWeeklyTrigger = (course) => {
  if (
    typeof course?.dayOfWeek !== "number" ||
    !isValidTimeValue(course.startTime)
  ) {
    return null;
  }

  const parsedTime = parseTimeValue(course.startTime);

  if (!parsedTime) {
    return null;
  }

  return {
    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
    weekday: course.dayOfWeek + 1,
    hour: parsedTime.hour,
    minute: parsedTime.minute,
    channelId: ATTENDANCE_CHANNEL_ID,
  };
};

export const requestNotificationPermissionsAsync = async () => {
  const currentPermissions = await Notifications.getPermissionsAsync();

  if (currentPermissions.granted) {
    return true;
  }

  const requestedPermissions = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  return requestedPermissions.granted;
};

export const configureAttendanceNotificationsAsync = async () => {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ATTENDANCE_CHANNEL_ID, {
      name: "Yoklama Hatırlatıcıları",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0F766E",
    });
  }

  await Notifications.setNotificationCategoryAsync(
    ATTENDANCE_NOTIFICATION_CATEGORY,
    [
      {
        identifier: ATTENDANCE_ACTION_PRESENT,
        buttonTitle: "Derse girdim",
        options: { opensAppToForeground: true },
      },
      {
        identifier: ATTENDANCE_ACTION_ABSENT,
        buttonTitle: "Girmedim",
        options: { opensAppToForeground: true, isDestructive: true },
      },
    ],
  );
};

export const loadCoursesAsync = async () => {
  const storedCourses = await AsyncStorage.getItem(COURSE_STORAGE_KEY);

  if (!storedCourses) {
    return [];
  }

  try {
    return JSON.parse(storedCourses);
  } catch (error) {
    console.error("Error parsing stored courses:", error);
    return [];
  }
};

export const saveCoursesAsync = async (courses) => {
  await AsyncStorage.setItem(COURSE_STORAGE_KEY, JSON.stringify(courses));
};

export const rescheduleAttendanceNotificationsAsync = async (courses) => {
  await configureAttendanceNotificationsAsync();

  const hasPermission = await requestNotificationPermissionsAsync();

  if (!hasPermission) {
    return { notificationsEnabled: false };
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const course of courses) {
    const trigger = buildWeeklyTrigger(course);

    if (!trigger) {
      continue;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${course.name} dersi başladı`,
        body: "Derse girdin mi?",
        sound: "default",
        categoryIdentifier: ATTENDANCE_NOTIFICATION_CATEGORY,
        data: {
          courseId: course.id,
          courseName: course.name,
        },
      },
      trigger,
    });
  }

  return { notificationsEnabled: true };
};

export const recordCourseAttendanceAsync = async (courseId, status) => {
  const courses = await loadCoursesAsync();
  const dateKey = getDateKey();

  const updatedCourses = courses.map((course) => {
    if (course.id !== courseId) {
      return course;
    }

    const baseCourse = {
      ...course,
      lastAttendanceDateKey: dateKey,
    };

    if (status === "absent") {
      const missedHours = Number(course.missedHours) || 0;
      const courseHours = Number(course.hours) || 0;
      const newMissedHours = missedHours + courseHours;

      return {
        ...baseCourse,
        missedHours: newMissedHours,
      };
    }

    return baseCourse;
  });

  await saveCoursesAsync(updatedCourses);

  return updatedCourses.find((course) => course.id === courseId) || null;
};
