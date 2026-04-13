# Bireysel Yoklama Sistemi

**Bireysel Yoklama Sistemi** öğrencilerin ders devam durumlarını şeffaf, düzenli ve anlık olarak takip edebilmeleri için geliştirilmiş, **çevrimdışı (offline)** çalışan bir mobil takip uygulamasıdır. 

Özellikle yoğun ders programına sahip öğrencilerin, derslerindeki saat hesaplamalarını manuel yapmak yerine dijital bir asistan yardımıyla devamsızlık sınırlarını yönetmelerini sağlar.

## 🚀 Öne Çıkan Özellikler

* **Kişiselleştirilmiş Program:** Dönem başında alınan derslerin adını, haftalık saatini ve devamsızlık sınırını sisteme kaydedebilirsiniz.
* **Haftalık Filtreleme:** Uygulama sadece ilgili günün derslerini karşınıza getirir.
* **Akıllı Hesaplama:** "Girdim" veya "Girmedim" butonları ile tek dokunuşla yoklama bilgisini işleyebilir, kalan devamsızlık hakkınızı anlık olarak görebilirsiniz.
* **Hatırlatıcı Bildirimler:** Ders saatleri yaklaştığında sistem otomatik bildirim göndererek yoklama girişini unutmamanızı sağlar.
* **Yerel Veri Depolama:** Verileriniz cihazın yerel hafızasında (AsyncStorage) tutulur; üyelik veya internet bağlantısı gerektirmez.

## 🛠️ Kullanılan Teknolojiler

* **Framework:** [React Native](https://reactnative.dev/)
* **Geliştirme Ortamı:** [Expo](https://expo.dev/)
* **Veri Yönetimi:** @react-native-async-storage/async-storage
* **Bildirimler:** expo-notifications
* **Navigasyon:** React Navigation (Bottom Tabs)

## 📋 Kurulum ve Çalıştırma

Projeyi yerel bilgisayarınızda çalıştırmak için aşağıdaki adımları izleyin:

1.  **Depoyu Klonlayın:**
    ```bash
    git clone [https://github.com/EmirhanCorut52/Individual-Attendance-System.git](https://github.com/EmirhanCorut52/Individual-Attendance-System.git)
    cd Individual-Attendance-System
    ```

2.  **Paketleri Yükleyin:**
    ```bash
    npm install @react-navigation/native
    npx expo install react-native-screens react-native-safe-area-context
    npm install @react-navigation/bottom-tabs
    npx expo install @react-native-async-storage/async-storage
    npx expo install expo-notifications
    ```

3.  **Projeyi Başlatın:**
    ```bash
    npx expo start
    ```

4.  **Test Etme:**
    Terminalde çıkan QR kodu telefonunuzdaki **Expo Go** uygulaması ile okutarak projeyi anında test edebilirsiniz.

## 🏗️ Sistem Akışı

Uygulama temel olarak şu adımları izler:
1.  **Ders Kaydı:** Ders adı ve devamsızlık limiti tanımlanır.
2.  **Günlük Takip:** O günün dersleri listelenir ve katılım durumu girilir.
3.  **Hesaplama Algoritması:** Girilmeyen ders saatleri toplam haktan düşülür.
4.  **İstatistik:** Kalan haklar görsel uyarılarla (kritik sınır kontrolü) kullanıcıya sunulur.