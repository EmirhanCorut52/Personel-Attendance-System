import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const DersKarti = ({
  item,
  seciliTarih,
  suankiSaat,
  yoklamaGir,
  yoklamaGeriAl,
  isTatilGunu,
}) => {
  const [kacSaatYok, setKacSaatYok] = useState(0);

  const tatilMi = isTatilGunu(seciliTarih);

  const butonlarAktifMi = () => {
    const [dersSaat, dersDakika] = item.saat.split(":").map(Number);
    const dersinZamani = new Date(seciliTarih);
    dersinZamani.setHours(dersSaat, dersDakika, 0, 0);
    const farkMillisaniye = dersinZamani.getTime() - suankiSaat.getTime();
    return farkMillisaniye <= 300000;
  };

  const aktif = butonlarAktifMi();

  const gununTarihi = seciliTarih.toDateString();
  // FIX: yoklamaGecmisi her zaman var (DersEkleScreen'de başlangıçta oluşturuluyor) ama eski kayıtlar için güvenli kontrol
  const islemTamam =
    item.yoklamaGecmisi != null &&
    item.yoklamaGecmisi[gununTarihi] !== undefined;
  const kaydedilenSaat = islemTamam ? item.yoklamaGecmisi[gununTarihi] : 0;

  const artir = () =>
    setKacSaatYok((prev) => (prev < item.haftalikSaat ? prev + 1 : prev));
  const azalt = () => setKacSaatYok((prev) => (prev > 0 ? prev - 1 : prev));

  // FIX: tarih değiştiğinde sayacı sıfırla
  useEffect(() => {
    setKacSaatYok(0);
  }, [seciliTarih]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{item.ad}</Text>
      <Text style={styles.subtitle}>
        {item.saat} | Süre: {item.haftalikSaat} Saat
      </Text>

      {tatilMi && (
        <View style={styles.tatilBadge}>
          <Ionicons name="airplane" size={16} color="#f39c12" />
          <Text style={styles.tatilBadgeText}>Tatil Günü</Text>
        </View>
      )}

      {!aktif ? (
        <View style={styles.kilitliKutu}>
          <Text style={styles.kilitliKutuText}>Bekleyen ders</Text>
          <Text style={styles.kilitliAltText}>
            Derse 5 dk kala ve sonrasında yoklama açılır.
          </Text>
        </View>
      ) : tatilMi ? (
        <View
          style={[
            styles.kilitliKutu,
            { backgroundColor: "#fff3cd", paddingVertical: 20 },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="alert-circle" size={30} color="#f39c12" />
            <Text
              style={[
                styles.kilitliKutuText,
                { color: "#f39c12", marginLeft: 10, fontSize: 16 },
              ]}
            >
              Tatil Günü - Yoklama Alınmayacak
            </Text>
          </View>
        </View>
      ) : islemTamam ? (
        <View
          style={[
            styles.kilitliKutu,
            { backgroundColor: "#e8f8f5", paddingVertical: 20 },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="checkmark-circle" size={30} color="#2ecc71" />
            <Text
              style={[
                styles.kilitliKutuText,
                { color: "#2ecc71", marginLeft: 10, fontSize: 16 },
              ]}
            >
              Yoklama İşlendi ({kaydedilenSaat} Saat Devamsız)
            </Text>
          </View>
          <TouchableOpacity
            style={styles.geriAlBtn}
            onPress={() => yoklamaGeriAl(item.id)}
          >
            <Ionicons name="refresh-circle" size={20} color="#e74c3c" />
            <Text style={styles.geriAlBtnText}>Yanlış girdim, geri al</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.yoklamaAlani}>
          <Text style={styles.soruText}>Kaç saat devamsızlık yaptın?</Text>

          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={styles.yuvarlakBtn}
              onPress={azalt}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.sayacText}>{kacSaatYok} Saat</Text>
            <TouchableOpacity
              style={styles.yuvarlakBtn}
              onPress={artir}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.kaydetBtn}
            onPress={() => yoklamaGir(item.id, kacSaatYok)}
            activeOpacity={0.8}
          >
            <Text style={styles.kaydetBtnText}>Yoklamayı Kaydet</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default function DersProgramiScreen() {
  const [bugunkuDersler, setBugunkuDersler] = useState([]);
  const [suankiSaat, setSuankiSaat] = useState(new Date());
  const [seciliTarih, setSeciliTarih] = useState(new Date());
  const [takvimVisible, setTakvimVisible] = useState(false);
  // FIX: Takvimde ay gezintisi için ayrı state
  const [takvimAyi, setTakvimAyi] = useState(new Date());
  const [tatilGunleri, setTatilGunleri] = useState([]);

  const gunIsminiAl = (tarih) => {
    const gunler = [
      "Pazar",
      "Pazartesi",
      "Salı",
      "Çarşamba",
      "Perşembe",
      "Cuma",
      "Cumartesi",
    ];
    return gunler[tarih.getDay()];
  };

  const ayIsminiAl = (tarih) => {
    const aylar = [
      "Ocak",
      "Şubat",
      "Mart",
      "Nisan",
      "Mayıs",
      "Haziran",
      "Temmuz",
      "Ağustos",
      "Eylül",
      "Ekim",
      "Kasım",
      "Aralık",
    ];
    return aylar[tarih.getMonth()];
  };

  const tamTarihFormatla = (tarih) => `${tarih.getDate()} ${ayIsminiAl(tarih)}`;
  const ayYilFormatla = (tarih) =>
    `${ayIsminiAl(tarih)} ${tarih.getFullYear()}`;

  useEffect(() => {
    const timer = setInterval(() => setSuankiSaat(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Explicit permission request on mount to ensure user sees the dialog
  useEffect(() => {
    const ensurePermission = async () => {
      try {
        const { granted, status } = await Notifications.getPermissionsAsync();
        console.log("Bildirim izin durumu (önce):", status, granted);
        if (!granted) {
          const req = await Notifications.requestPermissionsAsync();
          console.log("Bildirim izin sonucu:", req);
          if (!req.granted) {
            Alert.alert(
              "Bildirim İzni Gerekli",
              "Bildirimleri almak için izin vermeniz gerekir. Ayarlardan izin vermek ister misiniz?",
              [
                { text: "Hayır", style: "cancel" },
                {
                  text: "Ayarlar",
                  onPress: () => {
                    Linking.openSettings();
                  },
                },
              ],
            );
          }
        }
      } catch (e) {
        console.log("İzin isteği hatası:", e);
      }
    };

    ensurePermission();
  }, []);

  // Android: create default notification channel
  useEffect(() => {
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      }).catch((e) => console.log("channel error", e));
    }
  }, []);

  // FIX: dersleriGetirVeFiltrele useCallback ile sarıldı, seciliTarih dependency doğru şekilde eklendi
  const dersleriGetirVeFiltrele = useCallback(async () => {
    try {
      const veriler = await AsyncStorage.getItem("@dersler");
      if (veriler !== null) {
        const tumDersler = JSON.parse(veriler);
        const seciliGunAdi = gunIsminiAl(seciliTarih);
        const filtrelenmis = tumDersler.filter(
          (ders) => ders.gun === seciliGunAdi,
        );
        filtrelenmis.sort(
          (a, b) =>
            parseInt(a.saat.replace(":", "")) -
            parseInt(b.saat.replace(":", "")),
        );
        setBugunkuDersler(filtrelenmis);
      } else {
        setBugunkuDersler([]);
      }
    } catch (e) {
      console.log(e);
    }
  }, [seciliTarih]);

  // Tatilleri Getir
  const tatilleriGetir = useCallback(async () => {
    try {
      const veriler = await AsyncStorage.getItem("@tatilGunleri");
      const tatiller = veriler ? JSON.parse(veriler) : [];
      setTatilGunleri(tatiller);
    } catch (e) {
      console.log(e);
    }
  }, []);

  // Verilen tarihin tatil olup olmadığını kontrol et
  const isTatilGunu = useCallback(
    (tarih) => {
      return tatilGunleri.some((tatil) => {
        const baslangic = new Date(tatil.baslangic);
        const bitis = new Date(tatil.bitis);
        baslangic.setHours(0, 0, 0, 0);
        bitis.setHours(0, 0, 0, 0);
        const gunuTarih = new Date(tarih);
        gunuTarih.setHours(0, 0, 0, 0);
        return gunuTarih >= baslangic && gunuTarih <= bitis;
      });
    },
    [tatilGunleri],
  );

  // Bildirimleri planlama: her odakta dersleri alıp bir sonraki gerçekleşme için 15 dakika önce bildirim planlar
  const scheduleNotifications = async () => {
    try {
      console.log("Bildirim: izin kontrolü başlıyor");
      const perm = await Notifications.getPermissionsAsync();
      if (!perm.granted) {
        const request = await Notifications.requestPermissionsAsync();
        if (!request.granted) {
          console.log("Bildirim izni reddedildi");
          return;
        }
      }

      await Notifications.cancelAllScheduledNotificationsAsync();

      const veriler = await AsyncStorage.getItem("@dersler");
      if (!veriler) {
        console.log("Bildirim: ders yok");
        return;
      }
      const tumDersler = JSON.parse(veriler);

      const dayNameToIndex = {
        Pazar: 0,
        Pazartesi: 1,
        Salı: 2,
        Çarşamba: 3,
        Perşembe: 4,
        Cuma: 5,
        Cumartesi: 6,
      };

      const now = new Date();

      console.log(`Bildirim: ${tumDersler.length} ders bulundu`);

      for (const ders of tumDersler) {
        const targetDay = dayNameToIndex[ders.gun];
        if (targetDay === undefined) continue;

        const next = new Date(now);
        let offset = (targetDay - next.getDay() + 7) % 7;
        // if today and class hour already passed, schedule next week
        const [hh, mm] = ders.saat.split(":").map(Number);
        if (offset === 0) {
          if (
            now.getHours() > hh ||
            (now.getHours() === hh && now.getMinutes() >= mm)
          ) {
            offset = 7;
          }
        }
        next.setDate(next.getDate() + offset);
        next.setHours(hh, mm, 0, 0);

        // 15 dakika önce
        const notifyAt = new Date(next);
        notifyAt.setMinutes(notifyAt.getMinutes() - 15);

        if (notifyAt > now) {
          console.log(
            `Bildirim planlanıyor: ${ders.ad} -> ${notifyAt.toString()}`,
          );
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `Derse Yaklaşılıyor: ${ders.ad}`,
              body: `${ders.saat} dersine 15 dakika kaldı`,
              data: { dersId: ders.id },
              android: { channelId: "default" },
            },
            trigger: { date: notifyAt },
          });
        } else {
          console.log(
            `Bildirim atlandı (geçmiş): ${ders.ad} -> ${notifyAt.toString()}`,
          );
        }
      }
    } catch (e) {
      console.log("Bildirim planlama hatası:", e);
    }
  };

  // FIX: useFocusEffect artık kararlı useCallback referansını kullanıyor
  useFocusEffect(
    useCallback(() => {
      dersleriGetirVeFiltrele();
      tatilleriGetir();
      scheduleNotifications();
    }, [dersleriGetirVeFiltrele, tatilleriGetir]),
  );

  const tarihDegistir = (gunSayisi) => {
    const yeniTarih = new Date(seciliTarih);
    yeniTarih.setDate(seciliTarih.getDate() + gunSayisi);
    setSeciliTarih(yeniTarih);
  };

  const yoklamaGir = async (dersId, girilmeyenSaat) => {
    // Tatil günü kontrolü
    if (isTatilGunu(seciliTarih)) {
      Alert.alert(
        "Bilgi",
        "Bu gün tatil olarak işaretlenmiş. Yoklama alınmayacaktır.",
      );
      return;
    }

    try {
      const veriler = await AsyncStorage.getItem("@dersler");
      let tumDersler = JSON.parse(veriler);

      tumDersler = tumDersler.map((ders) => {
        if (ders.id === dersId) {
          ders.yapilanDevamsizlik += girilmeyenSaat;
          if (!ders.yoklamaGecmisi) ders.yoklamaGecmisi = {};
          ders.yoklamaGecmisi[seciliTarih.toDateString()] = girilmeyenSaat;
        }
        return ders;
      });

      await AsyncStorage.setItem("@dersler", JSON.stringify(tumDersler));
      Alert.alert(
        "İşlem Tamam",
        girilmeyenSaat === 0
          ? "Derse tam katılım sağlandı!"
          : `${girilmeyenSaat} saat devamsızlık işlendi.`,
      );
      dersleriGetirVeFiltrele();
    } catch (e) {
      console.log(e);
    }
  };

  const yoklamaGeriAl = async (dersId) => {
    try {
      const veriler = await AsyncStorage.getItem("@dersler");
      let tumDersler = JSON.parse(veriler);

      tumDersler = tumDersler.map((ders) => {
        if (ders.id === dersId) {
          const gunTarihi = seciliTarih.toDateString();
          if (
            ders.yoklamaGecmisi &&
            ders.yoklamaGecmisi[gunTarihi] !== undefined
          ) {
            ders.yapilanDevamsizlik -= ders.yoklamaGecmisi[gunTarihi];
            if (ders.yapilanDevamsizlik < 0) ders.yapilanDevamsizlik = 0;
            delete ders.yoklamaGecmisi[gunTarihi];
          }
        }
        return ders;
      });

      await AsyncStorage.setItem("@dersler", JSON.stringify(tumDersler));
      dersleriGetirVeFiltrele();
    } catch (e) {
      console.log(e);
    }
  };

  // FIX: takvimAyi'na göre gün listesi oluşturuluyor, seciliTarih'e göre değil
  const ayinGunleriniGetir = () => {
    const yil = takvimAyi.getFullYear();
    const ay = takvimAyi.getMonth();
    const gunSayisi = new Date(yil, ay + 1, 0).getDate();
    const gunler = [];
    for (let i = 1; i <= gunSayisi; i++) gunler.push(new Date(yil, ay, i));
    return gunler;
  };

  const takvimAyDegistir = (fark) => {
    const yeni = new Date(takvimAyi);
    yeni.setMonth(takvimAyi.getMonth() + fark);
    setTakvimAyi(yeni);
  };

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => tarihDegistir(-1)}>
          <Ionicons name="chevron-back-circle" size={35} color="#2ecc71" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateDisplay}
          onPress={() => {
            setTakvimAyi(new Date(seciliTarih)); // takvimi seçili ay ile aç
            setTakvimVisible(true);
          }}
        >
          <Text style={styles.dateText}>{tamTarihFormatla(seciliTarih)}</Text>
          <Text style={styles.dayText}>{gunIsminiAl(seciliTarih)}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => tarihDegistir(1)}>
          <Ionicons name="chevron-forward-circle" size={35} color="#2ecc71" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={bugunkuDersler}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DersKarti
            item={item}
            seciliTarih={seciliTarih}
            suankiSaat={suankiSaat}
            yoklamaGir={yoklamaGir}
            yoklamaGeriAl={yoklamaGeriAl}
            isTatilGunu={isTatilGunu}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Bu gün için ders programı boş.</Text>
        }
      />

      <Modal visible={takvimVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* FIX: Ay ileri/geri gezintisi eklendi */}
            <View style={styles.takvimNavRow}>
              <TouchableOpacity onPress={() => takvimAyDegistir(-1)}>
                <Ionicons name="chevron-back" size={26} color="#2c3e50" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{ayYilFormatla(takvimAyi)}</Text>
              <TouchableOpacity onPress={() => takvimAyDegistir(1)}>
                <Ionicons name="chevron-forward" size={26} color="#2c3e50" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={ayinGunleriniGetir()}
              numColumns={7}
              keyExtractor={(item) => item.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.calendarDay,
                    item.toDateString() === seciliTarih.toDateString() &&
                      styles.selectedDay,
                  ]}
                  onPress={() => {
                    setSeciliTarih(item);
                    setTakvimVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.calendarDayText,
                      item.toDateString() === seciliTarih.toDateString() && {
                        color: "white",
                      },
                    ]}
                  >
                    {item.getDate()}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setTakvimVisible(false)}
            >
              <Text style={styles.closeBtnText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f6fa", padding: 10 },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 3,
  },
  dateDisplay: { alignItems: "center" },
  dateText: { fontSize: 18, fontWeight: "bold", color: "#2c3e50" },
  dayText: { fontSize: 14, color: "#7f8c8d" },
  card: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
  },
  title: { fontSize: 17, fontWeight: "bold" },
  subtitle: { color: "#7f8c8d", marginBottom: 10 },
  tatilBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff3cd",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
    width: "auto",
    alignSelf: "flex-start",
  },
  tatilBadgeText: {
    color: "#f39c12",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 5,
  },
  yoklamaAlani: {
    marginTop: 10,
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ecf0f1",
  },
  soruText: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "bold",
    color: "#34495e",
    marginBottom: 15,
  },
  stepperRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  yuvarlakBtn: {
    backgroundColor: "#e74c3c",
    width: 45,
    height: 45,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  sayacText: {
    fontSize: 22,
    fontWeight: "bold",
    marginHorizontal: 30,
    color: "#2c3e50",
  },
  kaydetBtn: {
    backgroundColor: "#2ecc71",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    elevation: 2,
  },
  kaydetBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },
  kilitliKutu: {
    backgroundColor: "#f1f2f6",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  kilitliKutuText: { fontWeight: "bold", color: "#95a5a6" },
  kilitliAltText: { fontSize: 11, color: "#bdc3c7", marginTop: 3 },
  geriAlBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: "white",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e74c3c",
  },
  geriAlBtnText: {
    color: "#e74c3c",
    fontWeight: "bold",
    marginLeft: 5,
    fontSize: 13,
  },
  emptyText: { textAlign: "center", marginTop: 50, color: "#95a5a6" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    minHeight: "50%",
  },
  takvimNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    color: "#2c3e50",
  },
  calendarDay: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    margin: 2,
    borderRadius: 8,
  },
  calendarDayText: { fontSize: 16 },
  selectedDay: { backgroundColor: "#2ecc71" },
  closeBtn: {
    marginTop: 20,
    backgroundColor: "#34495e",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  closeBtnText: { color: "white", fontWeight: "bold" },
});
