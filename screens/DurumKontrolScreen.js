import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export default function DurumKontrolScreen() {
  const [dersler, setDersler] = useState([]);
  const [riskliDersSayisi, setRiskliDersSayisi] = useState(0);

  const [limitModalGoster, setLimitModalGoster] = useState(false);
  const [seciliDers, setSeciliDers] = useState(null);
  const [yeniLimit, setYeniLimit] = useState("");

  const [silmeModalGoster, setSilmeModalGoster] = useState(false);
  const [silinecekDers, setSilinecekDers] = useState(null);

  // Tatil Yönetimi
  const [tatilGunleri, setTatilGunleri] = useState([]);
  const [tatilModalGoster, setTatilModalGoster] = useState(false);
  const [tatilAdı, setTatilAdı] = useState("");
  const [tatilBaslangic, setTatilBaslangic] = useState("");
  const [tatilBitis, setTatilBitis] = useState("");
  const [silinecekTatil, setSilinecekTatil] = useState(null);
  const [seciliTab, setSeciliTab] = useState("dersler"); // "dersler" veya "tatiller"

  // Takvim Modal
  const [takvimModalGoster, setTakvimModalGoster] = useState(false);
  const [takvimModalTipi, setTakvimModalTipi] = useState(null); // "baslangic" veya "bitis"
  const [takvimAyi, setTakvimAyi] = useState(new Date());

  useFocusEffect(
    useCallback(() => {
      dersleriGetir();
      tatilleriGetir();
    }, []),
  );

  const dersleriGetir = async () => {
    try {
      const veriler = await AsyncStorage.getItem("@dersler");
      if (veriler !== null) {
        const parsedDersler = JSON.parse(veriler);

        // Dersleri templateId'ye göre gruplandır
        const gruplandırılmıs = {};
        parsedDersler.forEach((ders) => {
          const templateId = ders.templateId || ders.id; // Eski kayıtlar için fallback

          if (!gruplandırılmıs[templateId]) {
            gruplandırılmıs[templateId] = {
              templateId: templateId,
              id: templateId, // Grup ID'si olarak templateId kullan
              ad: ders.ad,
              haftalikSaat: ders.haftalikSaat,
              sinir: ders.sinir,
              yapilanDevamsizlik: 0,
              yoklamaGecmisi: {},
              gunveSaatler: [],
              dersIds: [], // Silmek için orijinal IDs
            };
          }

          // Devamsızlıkları topla
          gruplandırılmıs[templateId].yapilanDevamsizlik +=
            ders.yapilanDevamsizlik;

          // Yoklama geçmişini birleştir
          if (ders.yoklamaGecmisi) {
            gruplandırılmıs[templateId].yoklamaGecmisi = {
              ...gruplandırılmıs[templateId].yoklamaGecmisi,
              ...ders.yoklamaGecmisi,
            };
          }

          // Gün ve saati ekle
          gruplandırılmıs[templateId].gunveSaatler.push({
            gun: ders.gun,
            saat: ders.saat,
            dersId: ders.id,
          });

          gruplandırılmıs[templateId].dersIds.push(ders.id);
        });

        const grupluDersler = Object.values(gruplandırılmıs);
        setDersler(grupluDersler);

        let riskliSayisi = 0;
        grupluDersler.forEach((ders) => {
          const yuzde = (ders.yapilanDevamsizlik / ders.sinir) * 100;
          if (yuzde >= 50) riskliSayisi++;
        });
        setRiskliDersSayisi(riskliSayisi);
      } else {
        setDersler([]);
        setRiskliDersSayisi(0);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const kesinSil = async () => {
    try {
      const veriler = await AsyncStorage.getItem("@dersler");
      if (veriler !== null) {
        const tumDersler = JSON.parse(veriler);
        // Silinen ders grubunun tüm derslerini sil
        const guncelDersler = tumDersler.filter(
          (ders) => !silinecekDers.dersIds.includes(ders.id),
        );
        await AsyncStorage.setItem("@dersler", JSON.stringify(guncelDersler));
        setSilmeModalGoster(false);
        setSilinecekDers(null);
        dersleriGetir();
      }
    } catch (e) {
      console.log(e);
    }
  };

  const limitDuzenlemeAc = (ders) => {
    setSeciliDers(ders);
    setYeniLimit(ders.sinir.toString());
    setLimitModalGoster(true);
  };

  const sadeceRakamGiris = (text) => {
    setYeniLimit(text.replace(/[^0-9]/g, ""));
  };

  const limitKaydet = async () => {
    if (!yeniLimit || parseInt(yeniLimit) === 0) {
      return;
    }

    try {
      const veriler = await AsyncStorage.getItem("@dersler");
      let tumDersler = JSON.parse(veriler);

      // Seçili dersin tüm gün/saat kombinasyonlarının limitini güncelle
      tumDersler = tumDersler.map((ders) => {
        if (seciliDers.dersIds.includes(ders.id)) {
          ders.sinir = parseInt(yeniLimit);
        }
        return ders;
      });

      await AsyncStorage.setItem("@dersler", JSON.stringify(tumDersler));
      setLimitModalGoster(false);
      dersleriGetir();
    } catch (e) {
      console.log(e);
    }
  };

  // Tatil Fonksiyonları
  const tatilleriGetir = async () => {
    try {
      const veriler = await AsyncStorage.getItem("@tatilGunleri");
      const tatiller = veriler ? JSON.parse(veriler) : [];
      setTatilGunleri(tatiller);
    } catch (e) {
      console.log(e);
    }
  };

  const tatilEkle = async () => {
    if (!tatilAdı.trim() || !tatilBaslangic || !tatilBitis) {
      Alert.alert("Hata", "Lütfen tüm alanları doldurun.");
      return;
    }

    const bas = new Date(tatilBaslangic);
    const bit = new Date(tatilBitis);

    if (bas > bit) {
      Alert.alert("Hata", "Başlangıç tarihi bitiş tarihinden önce olmalıdır.");
      return;
    }

    const yeniTatil = {
      id: Date.now().toString(),
      ad: tatilAdı.trim(),
      baslangic: tatilBaslangic,
      bitis: tatilBitis,
    };

    try {
      const mevcutTatiller = await AsyncStorage.getItem("@tatilGunleri");
      const tatiller = mevcutTatiller ? JSON.parse(mevcutTatiller) : [];
      tatiller.push(yeniTatil);
      await AsyncStorage.setItem("@tatilGunleri", JSON.stringify(tatiller));
      Alert.alert("Başarılı", "Tatil eklendi!");
      setTatilAdı("");
      setTatilBaslangic("");
      setTatilBitis("");
      tatilleriGetir();
    } catch (e) {
      console.log(e);
      Alert.alert("Hata", "Tatil eklenemedi.");
    }
  };

  const tatilSil = async () => {
    try {
      const mevcutTatiller = await AsyncStorage.getItem("@tatilGunleri");
      const tatiller = mevcutTatiller ? JSON.parse(mevcutTatiller) : [];
      const guncelTatiller = tatiller.filter(
        (tatil) => tatil.id !== silinecekTatil.id,
      );
      await AsyncStorage.setItem(
        "@tatilGunleri",
        JSON.stringify(guncelTatiller),
      );
      setSilinecekTatil(null);
      tatilleriGetir();
    } catch (e) {
      console.log(e);
    }
  };

  // Tarih İşlemleri
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

  const ayYilFormatla = (tarih) =>
    `${ayIsminiAl(tarih)} ${tarih.getFullYear()}`;

  const tarihFormatla = (tarihString) => {
    if (!tarihString) return "";
    const tarih = new Date(tarihString);
    const gun = String(tarih.getDate()).padStart(2, "0");
    const ay = String(tarih.getMonth() + 1).padStart(2, "0");
    const yil = tarih.getFullYear();
    return `${gun}.${ay}.${yil}`;
  };

  const tarihStringYap = (tarih) => {
    const gun = String(tarih.getDate()).padStart(2, "0");
    const ay = String(tarih.getMonth() + 1).padStart(2, "0");
    const yil = tarih.getFullYear();
    return `${yil}-${ay}-${gun}`;
  };

  const tarihSec = (tarih) => {
    const tarihString = tarihStringYap(tarih);
    if (takvimModalTipi === "baslangic") {
      setTatilBaslangic(tarihString);
    } else if (takvimModalTipi === "bitis") {
      setTatilBitis(tarihString);
    }
    setTakvimModalGoster(false);
    setTatilModalGoster(true);
  };

  const ayinGunleriniGetir = () => {
    const yil = takvimAyi.getFullYear();
    const ay = takvimAyi.getMonth();
    const gunSayisi = new Date(yil, ay + 1, 0).getDate();
    const gunler = [];
    for (let i = 1; i <= gunSayisi; i++) {
      gunler.push(new Date(yil, ay, i));
    }
    return gunler;
  };

  const takvimAyDegistir = (fark) => {
    const yeni = new Date(takvimAyi);
    yeni.setMonth(takvimAyi.getMonth() + fark);
    setTakvimAyi(yeni);
  };

  const renderDurum = ({ item }) => {
    const kalanHak = Math.max(0, item.sinir - item.yapilanDevamsizlik);

    let yuzde = (item.yapilanDevamsizlik / item.sinir) * 100;
    if (yuzde > 100) yuzde = 100;
    if (yuzde < 0) yuzde = 0;

    let durumRengi = "#2ecc71";
    let mesaj = "Durum Güvenli";

    if (yuzde >= 80) {
      durumRengi = "#e74c3c";
      mesaj = "Kritik Seviye!";
    } else if (yuzde >= 50) {
      durumRengi = "#f39c12";
      mesaj = "Dikkatli Ol";
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{item.ad}</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              onPress={() => limitDuzenlemeAc(item)}
              style={styles.iconBtn}
            >
              <Ionicons name="create-outline" size={24} color="#3498db" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setSilinecekDers(item);
                setSilmeModalGoster(true);
              }}
              style={styles.iconBtn}
            >
              <Ionicons name="trash-outline" size={24} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Ders Saatleri */}
        {item.gunveSaatler && item.gunveSaatler.length > 0 && (
          <View style={styles.gunveSaatlerContainer}>
            {item.gunveSaatler.map((gs, idx) => (
              <View key={idx} style={styles.gunveSaatiBadge}>
                <Text style={styles.gunveSaatiText}>
                  {gs.gun} {gs.saat}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Toplam Limit</Text>
            <Text style={styles.value}>{item.sinir} Saat</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Kullanılan</Text>
            <Text style={[styles.value, { color: durumRengi }]}>
              {item.yapilanDevamsizlik} Saat
            </Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Kalan Hak</Text>
            <Text style={[styles.value, { color: durumRengi }]}>
              {kalanHak} Saat
            </Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${yuzde}%`, backgroundColor: durumRengi },
              ]}
            />
          </View>
          <Text style={[styles.mesajText, { color: durumRengi }]}>
            {mesaj} (%{Math.round(yuzde)} Dolu)
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.ozetPanosu}>
          <View style={styles.ozetKutu}>
            <Text style={styles.ozetSayi}>{dersler.length}</Text>
            <Text style={styles.ozetYazi}>Kayıtlı Ders</Text>
          </View>
          <View style={styles.ayrac} />
          <View style={styles.ozetKutu}>
            <Text
              style={[
                styles.ozetSayi,
                { color: riskliDersSayisi > 0 ? "#e74c3c" : "#2ecc71" },
              ]}
            >
              {riskliDersSayisi}
            </Text>
            <Text style={styles.ozetYazi}>Riskli Ders</Text>
          </View>
        </View>
      </TouchableWithoutFeedback>

      {/* Tab Kontrol */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, seciliTab === "dersler" && styles.tabAktif]}
          onPress={() => setSeciliTab("dersler")}
        >
          <Text
            style={[
              styles.tabText,
              seciliTab === "dersler" && styles.tabTextAktif,
            ]}
          >
            Dersler
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, seciliTab === "tatiller" && styles.tabAktif]}
          onPress={() => setSeciliTab("tatiller")}
        >
          <Text
            style={[
              styles.tabText,
              seciliTab === "tatiller" && styles.tabTextAktif,
            ]}
          >
            Tatiller
          </Text>
        </TouchableOpacity>
      </View>

      {seciliTab === "dersler" ? (
        <FlatList
          data={dersler}
          keyExtractor={(item) => item.id}
          renderItem={renderDurum}
          contentContainerStyle={{ paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={styles.emptyText}>Henüz hiç ders eklemediniz.</Text>
          }
        />
      ) : (
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={styles.tatilEkleBtn}
            onPress={() => setTatilModalGoster(true)}
          >
            <Ionicons name="add-circle" size={24} color="white" />
            <Text style={styles.tatilEkleBtnText}>Yeni Tatil Ekle</Text>
          </TouchableOpacity>

          <FlatList
            data={tatilGunleri}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.tatilCard}>
                <View style={styles.tatilHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tatilAdi}>{item.ad}</Text>
                    <Text style={styles.tatilTarih}>
                      {new Date(item.baslangic).toLocaleDateString("tr-TR")} -{" "}
                      {new Date(item.bitis).toLocaleDateString("tr-TR")}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSilinecekTatil(item)}
                    style={styles.tatilSilBtn}
                  >
                    <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Henüz tatil eklemediniz.</Text>
            }
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </View>
      )}

      <Modal visible={limitModalGoster} transparent={true} animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sınırı Güncelle</Text>
            <Text style={styles.modalAltText}>
              {seciliDers?.ad} dersi için yeni devamsızlık limitini giriniz.
            </Text>

            <TextInput
              style={styles.modalInput}
              value={yeniLimit}
              onChangeText={sadeceRakamGiris}
              keyboardType="numeric"
              placeholder="Örn: 16"
              maxLength={3}
            />

            <View style={styles.modalButonRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.iptalBtn]}
                onPress={() => setLimitModalGoster(false)}
              >
                <Text style={styles.modalBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#3498db" }]}
                onPress={limitKaydet}
              >
                <Text style={styles.modalBtnText}>Güncelle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={silmeModalGoster}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Ionicons
              name="warning"
              size={50}
              color="#e74c3c"
              style={{ textAlign: "center", marginBottom: 10 }}
            />
            <Text style={styles.modalTitle}>Dersi Sil</Text>
            <Text style={styles.modalAltText}>
              <Text style={{ fontWeight: "bold", color: "#2c3e50" }}>
                {silinecekDers?.ad}
              </Text>{" "}
              dersini ve tüm devamsızlık kayıtlarını kalıcı olarak silmek
              istediğine emin misin?
            </Text>

            <View style={styles.modalButonRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.iptalBtn]}
                onPress={() => setSilmeModalGoster(false)}
              >
                <Text style={styles.modalBtnText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.silBtn]}
                onPress={kesinSil}
              >
                <Text style={styles.modalBtnText}>Evet, Sil</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Tatil Ekleme Modal */}
      <Modal
        visible={tatilModalGoster}
        transparent={true}
        animationType="slide"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Tatil Ekle</Text>

              <Text style={styles.modalLabel}>Tatil Adı</Text>
              <TextInput
                style={styles.modalInput}
                value={tatilAdı}
                onChangeText={setTatilAdı}
                placeholder="Örn: Yaz Tatili"
              />

              <Text style={styles.modalLabel}>Başlangıç Tarihi</Text>
              <TouchableOpacity
                style={styles.tarihSeciciBtn}
                onPress={() => {
                  setTatilModalGoster(false);
                  setTakvimModalTipi("baslangic");
                  setTakvimAyi(
                    tatilBaslangic ? new Date(tatilBaslangic) : new Date(),
                  );
                  setTakvimModalGoster(true);
                }}
              >
                <Ionicons name="calendar" size={20} color="#2ecc71" />
                <Text style={styles.tarihSeciciText}>
                  {tatilBaslangic
                    ? tarihFormatla(tatilBaslangic)
                    : "Tarih Seçin"}
                </Text>
              </TouchableOpacity>

              <Text style={styles.modalLabel}>Bitiş Tarihi</Text>
              <TouchableOpacity
                style={styles.tarihSeciciBtn}
                onPress={() => {
                  setTatilModalGoster(false);
                  setTakvimModalTipi("bitis");
                  setTakvimAyi(tatilBitis ? new Date(tatilBitis) : new Date());
                  setTakvimModalGoster(true);
                }}
              >
                <Ionicons name="calendar" size={20} color="#2ecc71" />
                <Text style={styles.tarihSeciciText}>
                  {tatilBitis ? tarihFormatla(tatilBitis) : "Tarih Seçin"}
                </Text>
              </TouchableOpacity>

              <View style={styles.modalButonRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.iptalBtn]}
                  onPress={() => setTatilModalGoster(false)}
                >
                  <Text style={styles.modalBtnText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: "#2ecc71" }]}
                  onPress={tatilEkle}
                >
                  <Text style={styles.modalBtnText}>Ekle</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Tatil Silme Modal */}
      <Modal
        visible={silinecekTatil !== null}
        transparent={true}
        animationType="slide"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Ionicons
                name="warning"
                size={50}
                color="#e74c3c"
                style={{ textAlign: "center", marginBottom: 10 }}
              />
              <Text style={styles.modalTitle}>Tatili Sil</Text>
              <Text style={styles.modalAltText}>
                <Text style={{ fontWeight: "bold", color: "#2c3e50" }}>
                  {silinecekTatil?.ad}
                </Text>{" "}
                tatilini silmek istediğine emin misin?
              </Text>

              <View style={styles.modalButonRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.iptalBtn]}
                  onPress={() => setSilinecekTatil(null)}
                >
                  <Text style={styles.modalBtnText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.silBtn]}
                  onPress={tatilSil}
                >
                  <Text style={styles.modalBtnText}>Evet, Sil</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Takvim Modal */}
      <Modal
        visible={takvimModalGoster}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.takvimModalContainer}>
          <View style={styles.takvimModalContent}>
            <View style={styles.takvimNavRow}>
              <TouchableOpacity onPress={() => takvimAyDegistir(-1)}>
                <Ionicons name="chevron-back" size={26} color="#2c3e50" />
              </TouchableOpacity>
              <Text style={styles.takvimTitle}>{ayYilFormatla(takvimAyi)}</Text>
              <TouchableOpacity onPress={() => takvimAyDegistir(1)}>
                <Ionicons name="chevron-forward" size={26} color="#2c3e50" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={ayinGunleriniGetir()}
              numColumns={7}
              keyExtractor={(item) => item.toString()}
              columnWrapperStyle={styles.takvimGunRow}
              renderItem={({ item }) => {
                const seciliTarih =
                  takvimModalTipi === "baslangic" ? tatilBaslangic : tatilBitis;
                const isSelected =
                  seciliTarih &&
                  new Date(seciliTarih).toDateString() === item.toDateString();

                return (
                  <TouchableOpacity
                    style={[
                      styles.takvimGun,
                      isSelected && styles.takvimGunSecili,
                    ]}
                    onPress={() => tarihSec(item)}
                  >
                    <Text
                      style={[
                        styles.takvimGunText,
                        isSelected && styles.takvimGunTextSecili,
                      ]}
                    >
                      {item.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={styles.takvimGunleriContainer}
              scrollEnabled={false}
            />

            <TouchableOpacity
              style={styles.takvimKapatBtn}
              onPress={() => {
                setTakvimModalGoster(false);
                setTatilModalGoster(true);
              }}
            >
              <Text style={styles.takvimKapatBtnText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#f5f6fa" },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 15,
    backgroundColor: "#ecf0f1",
    borderRadius: 10,
    padding: 5,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  tabAktif: {
    backgroundColor: "#2ecc71",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7f8c8d",
  },
  tabTextAktif: {
    color: "white",
  },
  ozetPanosu: {
    flexDirection: "row",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    elevation: 3,
    justifyContent: "space-around",
    alignItems: "center",
  },
  ozetKutu: { alignItems: "center" },
  ozetSayi: { fontSize: 32, fontWeight: "bold", color: "#34495e" },
  ozetYazi: { fontSize: 14, color: "#7f8c8d", marginTop: 5 },
  ayrac: { width: 1, height: "80%", backgroundColor: "#ecf0f1" },
  card: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f2f6",
    paddingBottom: 10,
  },
  title: { fontSize: 18, fontWeight: "bold", color: "#2c3e50", flex: 1 },
  headerIcons: { flexDirection: "row" },
  iconBtn: { marginLeft: 15, padding: 2 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  infoBox: { alignItems: "center", flex: 1 },
  label: {
    color: "#95a5a6",
    fontSize: 12,
    marginBottom: 5,
    fontWeight: "bold",
  },
  value: { fontSize: 18, fontWeight: "bold", color: "#34495e" },
  progressContainer: { marginTop: 5 },
  progressBarBackground: {
    height: 12,
    backgroundColor: "#ecf0f1",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 6 },
  mesajText: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "right",
    marginTop: 8,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    color: "#95a5a6",
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 25,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 10,
    textAlign: "center",
  },
  modalAltText: {
    fontSize: 16,
    color: "#7f8c8d",
    marginBottom: 25,
    textAlign: "center",
    lineHeight: 22,
  },
  modalInput: {
    backgroundColor: "#f5f6fa",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dcdde1",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 8,
    marginTop: 15,
  },
  tatilEkleBtn: {
    flexDirection: "row",
    backgroundColor: "#2ecc71",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  tatilEkleBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  tatilCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
  },
  tatilHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tatilAdi: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 5,
  },
  tatilTarih: {
    fontSize: 13,
    color: "#95a5a6",
  },
  tatilSilBtn: {
    padding: 8,
  },
  modalButonRow: { flexDirection: "row", justifyContent: "space-between" },
  modalBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  iptalBtn: { backgroundColor: "#95a5a6" },
  silBtn: { backgroundColor: "#e74c3c" },
  modalBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },
  gunveSaatlerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
    gap: 6,
  },
  gunveSaatiBadge: {
    backgroundColor: "#e8f8f5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderLeftWidth: 3,
    borderLeftColor: "#2ecc71",
  },
  gunveSaatiText: {
    fontSize: 12,
    color: "#27ae60",
    fontWeight: "600",
  },
  tarihSeciciBtn: {
    flexDirection: "row",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dcdde1",
    alignItems: "center",
    marginBottom: 20,
  },
  tarihSeciciText: {
    fontSize: 16,
    color: "#2c3e50",
    marginLeft: 10,
    fontWeight: "600",
  },
  takvimModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  takvimModalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    maxHeight: "80%",
  },
  takvimNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  takvimTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  takvimGunleriContainer: {
    width: "100%",
  },
  takvimGunRow: {
    width: "100%",
    justifyContent: "flex-start",
  },
  takvimGun: {
    flex: 1,
    maxWidth: "14.2857%",
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 25,
    marginBottom: 8,
  },
  takvimGunSecili: {
    backgroundColor: "#2ecc71",
  },
  takvimGunText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
  },
  takvimGunTextSecili: {
    color: "white",
  },
  takvimKapatBtn: {
    backgroundColor: "#2ecc71",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
  },
  takvimKapatBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
