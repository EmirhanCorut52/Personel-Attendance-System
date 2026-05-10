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

export default function DersEkleScreen() {
  // Ders Şablonu Oluştur/Yönet
  const [dersAdi, setDersAdi] = useState("");
  const [haftalikSaat, setHaftalikSaat] = useState("");
  const [sinir, setSinir] = useState("");

  // Ders Tablosuna Ekle
  const [dersTemplateleri, setDersTemplateleri] = useState([]);
  const [seciliTemplate, setSeciliTemplate] = useState(null);
  const [gun, setGun] = useState("Pazartesi");
  const [saat, setSaat] = useState("08:00");

  const [gunModalGoster, setGunModalGoster] = useState(false);
  const [saatModalGoster, setSaatModalGoster] = useState(false);
  const [templateModalGoster, setTemplateModalGoster] = useState(false);
  const [tab, setTab] = useState("yeni"); // "mevcut" veya "yeni"

  const gunler = [
    "Pazartesi",
    "Salı",
    "Çarşamba",
    "Perşembe",
    "Cuma",
    "Cumartesi",
    "Pazar",
  ];

  const saatler = [];
  for (let i = 8; i <= 23; i++) {
    const st = i < 10 ? "0" + i : String(i);
    saatler.push(`${st}:00`, `${st}:15`, `${st}:30`, `${st}:45`);
  }

  // Ders Şablonlarını Getir
  const templaterleriGetir = useCallback(async () => {
    try {
      const veriler = await AsyncStorage.getItem("@dersTemplateleri");
      const templates = veriler ? JSON.parse(veriler) : [];
      setDersTemplateleri(templates);
    } catch (e) {
      console.log(e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      templaterleriGetir();
    }, [templaterleriGetir]),
  );

  // Yeni Ders Şablonu Oluştur
  const templateOlustur = async () => {
    if (!dersAdi.trim() || !haftalikSaat || !sinir) {
      Alert.alert("Hata", "Lütfen tüm alanları doldurun.");
      return;
    }

    if (parseInt(haftalikSaat) === 0 || parseInt(sinir) === 0) {
      Alert.alert("Hata", "Ders saati ve devamsızlık sınırı 0 olamaz.");
      return;
    }

    const yeniTemplate = {
      id: Date.now().toString(),
      ad: dersAdi.trim(),
      haftalikSaat: parseInt(haftalikSaat),
      sinir: parseInt(sinir),
    };

    try {
      const mevcutTemplates = await AsyncStorage.getItem("@dersTemplateleri");
      const templates = mevcutTemplates ? JSON.parse(mevcutTemplates) : [];
      templates.push(yeniTemplate);
      await AsyncStorage.setItem(
        "@dersTemplateleri",
        JSON.stringify(templates),
      );
      Alert.alert(
        "Başarılı",
        "Ders şablonu oluşturuldu. Şimdi programa ekleyebilirsin.",
      );
      setDersAdi("");
      setHaftalikSaat("");
      setSinir("");
      setSeciliTemplate(yeniTemplate);
      setTab("mevcut");
      templaterleriGetir();
    } catch (e) {
      console.log(e);
      Alert.alert("Hata", "Şablon oluşturulamadı.");
    }
  };

  // Seçilen Şablonu Tablosuna Ekle
  const dersEkle = async () => {
    if (!seciliTemplate) {
      Alert.alert("Hata", "Lütfen bir ders seçin.");
      return;
    }

    const yeniDers = {
      id: Date.now().toString(),
      templateId: seciliTemplate.id,
      ad: seciliTemplate.ad,
      gun: gun,
      saat: saat,
      haftalikSaat: seciliTemplate.haftalikSaat,
      sinir: seciliTemplate.sinir,
      yapilanDevamsizlik: 0,
      yoklamaGecmisi: {},
    };

    try {
      const mevcutDersler = await AsyncStorage.getItem("@dersler");
      const dersler = mevcutDersler ? JSON.parse(mevcutDersler) : [];
      dersler.push(yeniDers);
      await AsyncStorage.setItem("@dersler", JSON.stringify(dersler));
      Alert.alert("Başarılı", "Ders tablosuna eklendi!");
      setSinir("");
    } catch (e) {
      console.log(e);
      Alert.alert("Hata", "Ders eklenemedi.");
    }
  };

  const haftalikSaatDegisti = (text) => {
    setHaftalikSaat(text.replace(/[^0-9]/g, ""));
  };

  const sinirDegisti = (text) => {
    setSinir(text.replace(/[^0-9]/g, ""));
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        {/* Tab Seçimi */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, tab === "yeni" && styles.tabAktif]}
            onPress={() => setTab("yeni")}
          >
            <Text
              style={[styles.tabText, tab === "yeni" && styles.tabTextAktif]}
            >
              Yeni Ders Oluştur
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === "mevcut" && styles.tabAktif]}
            onPress={() => setTab("mevcut")}
          >
            <Text
              style={[styles.tabText, tab === "mevcut" && styles.tabTextAktif]}
            >
              Programa Ders Ekle
            </Text>
          </TouchableOpacity>
        </View>

        {tab === "mevcut" ? (
          // Mevcut Dersleri Seçme
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Ders Seç</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setTemplateModalGoster(true)}
            >
              <Text style={styles.selectorText}>
                {seciliTemplate ? seciliTemplate.ad : "Ders Seçin"}
              </Text>
            </TouchableOpacity>

            {seciliTemplate && (
              <View style={styles.dersBilgisi}>
                <Text style={styles.dersBilgisiText}>
                  Ders Saati: {seciliTemplate.haftalikSaat}
                </Text>
                <Text style={styles.dersBilgisiText}>
                  Devamsızlık Sınırı: {seciliTemplate.sinir}
                </Text>
              </View>
            )}

            <Text style={styles.label}>Ders Günü</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setGunModalGoster(true)}
            >
              <Text style={styles.selectorText}>{gun}</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Başlangıç Saati</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setSaatModalGoster(true)}
            >
              <Text style={styles.selectorText}>{saat}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={dersEkle}>
              <Text style={styles.buttonText}>Ders Tablosuna Ekle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Yeni Ders Şablonu Oluştur
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Ders Adı</Text>
            <TextInput
              style={styles.input}
              value={dersAdi}
              onChangeText={setDersAdi}
              placeholder="Örn: Matematik"
            />

            <Text style={styles.label}>Ders Saati</Text>
            <TextInput
              style={styles.input}
              value={haftalikSaat}
              onChangeText={haftalikSaatDegisti}
              placeholder="Örn: 4"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Devamsızlık Sınırı (Saat)</Text>
            <TextInput
              style={styles.input}
              value={sinir}
              onChangeText={sinirDegisti}
              placeholder="Örn: 16"
              keyboardType="numeric"
            />

            <TouchableOpacity style={styles.button} onPress={templateOlustur}>
              <Text style={styles.buttonText}>Şablon Oluştur</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Ders Şablonları Modal */}
        <Modal
          visible={templateModalGoster}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {dersTemplateleri.length > 0 ? (
                <FlatList
                  data={dersTemplateleri}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        seciliTemplate?.id === item.id &&
                          styles.modalItemSecili,
                      ]}
                      onPress={() => {
                        setSeciliTemplate(item);
                        setTemplateModalGoster(false);
                      }}
                    >
                      <Text style={styles.modalItemText}>{item.ad}</Text>
                      <Text style={styles.modalItemAltMetin}>
                        {item.haftalikSaat}h / {item.sinir}h
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              ) : (
                <Text style={styles.boshMetin}>
                  Henüz ders şablonu oluşturulmamış
                </Text>
              )}
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setTemplateModalGoster(false)}
              >
                <Text style={styles.modalCloseBtnText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Gün Seçimi Modal */}
        <Modal visible={gunModalGoster} transparent={true} animationType="fade">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <FlatList
                data={gunler}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setGun(item);
                      setGunModalGoster(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setGunModalGoster(false)}
              >
                <Text style={styles.modalCloseBtnText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Saat Seçimi Modal */}
        <Modal
          visible={saatModalGoster}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <FlatList
                data={saatler}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setSaat(item);
                      setSaatModalGoster(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSaatModalGoster(false)}
              >
                <Text style={styles.modalCloseBtnText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f5f6fa" },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 20,
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
  label: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 5,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  input: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dcdde1",
    fontSize: 16,
  },
  selector: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dcdde1",
    justifyContent: "center",
  },
  selectorText: { fontSize: 16, color: "#2c3e50" },
  button: {
    backgroundColor: "#2ecc71",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 25,
  },
  buttonText: { color: "white", fontSize: 18, fontWeight: "bold" },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    backgroundColor: "white",
    margin: 30,
    borderRadius: 12,
    padding: 20,
    maxHeight: "70%",
  },
  modalItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f2f6",
    alignItems: "center",
  },
  modalItemSecili: {
    backgroundColor: "#e8f8f5",
  },
  modalItemText: { fontSize: 18, color: "#34495e" },
  modalItemAltMetin: {
    fontSize: 13,
    color: "#95a5a6",
    marginTop: 4,
  },
  modalCloseBtn: {
    marginTop: 15,
    padding: 15,
    backgroundColor: "#e74c3c",
    borderRadius: 8,
    alignItems: "center",
  },
  modalCloseBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },
  dersBilgisi: {
    backgroundColor: "#e8f8f5",
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#2ecc71",
  },
  dersBilgisiText: {
    fontSize: 14,
    color: "#27ae60",
    fontWeight: "600",
    marginVertical: 3,
  },
  boshMetin: {
    fontSize: 16,
    color: "#95a5a6",
    textAlign: "center",
    paddingVertical: 30,
  },
});
