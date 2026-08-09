/**
 * references.js
 * --------------
 * Static reference data shown in the "Referensi Hukum" panel. This file
 * holds ONLY text sourced from published, widely available translations
 * (Kemenag RI for the Qur'an, standard hadith collections, and KHI Buku II).
 * Sources are labeled clearly so the app never blurs the line between the
 * Qur'an, hadith, fiqh interpretation, and Indonesian positive law (KHI).
 */

const REFERENCES = {
  quran: [
    {
      ref: 'QS. An-Nisa (4): 11',
      sourceType: 'quran',
      arabic:
        'يُوصِيكُمُ اللَّهُ فِي أَوْلَادِكُمْ ۖ لِلذَّكَرِ مِثْلُ حَظِّ الْأُنْثَيَيْنِ...',
      translation_id:
        'Allah mensyariatkan (mewajibkan) kepadamu tentang (pembagian warisan untuk) anak-anakmu, yaitu bagian seorang anak laki-laki sama dengan bagian dua orang anak perempuan. Jika anak itu semuanya perempuan yang jumlahnya lebih dari dua, maka bagian mereka dua pertiga dari harta yang ditinggalkan. Jika anak perempuan itu seorang saja, maka ia memperoleh setengah harta. Untuk kedua ibu-bapak, bagian masing-masing seperenam dari harta yang ditinggalkan, jika ia (yang meninggal) mempunyai anak. Jika ia tidak mempunyai anak dan ia diwarisi oleh kedua ibu-bapaknya (saja), maka ibunya mendapat sepertiga...',
      note:
        'Terjemahan mengikuti Al-Qur\'an dan Terjemahannya, Kementerian Agama RI. Ayat ini menjadi dasar utama bagian anak, ayah, dan ibu.',
      relevance: 'Dasar bagian anak laki-laki, anak perempuan, ayah, dan ibu.'
    },
    {
      ref: 'QS. An-Nisa (4): 12',
      sourceType: 'quran',
      arabic:
        'وَلَكُمْ نِصْفُ مَا تَرَكَ أَزْوَاجُكُمْ إِن لَّمْ يَكُن لَّهُنَّ وَلَدٌ...',
      translation_id:
        'Dan bagianmu (suami-suami) adalah seperdua dari harta yang ditinggalkan oleh istri-istrimu, jika mereka tidak mempunyai anak. Jika istri-istrimu itu mempunyai anak, maka kamu mendapat seperempat dari harta yang ditinggalkannya... Para istri memperoleh seperempat harta yang kamu tinggalkan jika kamu tidak mempunyai anak. Jika kamu mempunyai anak, maka para istri memperoleh seperdelapan dari harta yang kamu tinggalkan...',
      note:
        'Terjemahan mengikuti Al-Qur\'an dan Terjemahannya, Kementerian Agama RI. Ayat ini juga memuat ketentuan saudara seibu (kalalah).',
      relevance: 'Dasar bagian suami, istri, dan saudara seibu.'
    },
    {
      ref: 'QS. An-Nisa (4): 176',
      sourceType: 'quran',
      arabic:
        'يَسْتَفْتُونَكَ قُلِ اللَّهُ يُفْتِيكُمْ فِي الْكَلَالَةِ...',
      translation_id:
        'Mereka meminta fatwa kepadamu (tentang kalalah). Katakanlah, "Allah memberi fatwa kepadamu tentang kalalah (yaitu) jika seseorang meninggal dunia dan ia tidak mempunyai anak, tetapi mempunyai saudara perempuan, maka bagi saudaranya yang perempuan itu seperdua dari harta yang ditinggalkannya... Jika mereka (ahli waris) saudara laki-laki dan perempuan, maka bagian seorang saudara laki-laki sama dengan bagian dua orang saudara perempuan."',
      note:
        'Terjemahan mengikuti Al-Qur\'an dan Terjemahannya, Kementerian Agama RI. Ayat penutup surah ini secara khusus mengatur kalalah (pewaris tanpa keturunan dan tanpa ayah).',
      relevance: 'Dasar bagian saudara kandung/seayah dalam kondisi kalalah.'
    }
  ],
  hadith: [
    {
      book: 'Shahih al-Bukhari & Shahih Muslim',
      hadithNumber: 'HR. Bukhari no. 6732, HR. Muslim no. 1615',
      text_summary:
        'Nabi shallallahu \'alaihi wa sallam bersabda yang maknanya: berikanlah bagian-bagian faraidh kepada yang berhak menerimanya, dan sisanya (selebihnya) menjadi milik kerabat laki-laki yang paling dekat (ashabah).',
      relevance:
        'Menjadi dasar mekanisme dua tahap: bagian tetap (Ashabul Furudh) didahulukan, sisanya baru diberikan kepada ashabah.'
    },
    {
      book: 'Sunan at-Tirmidzi, Sunan Ibn Majah',
      hadithNumber: 'HR. Tirmidzi no. 2098, HR. Ibn Majah no. 2740',
      text_summary:
        'Diriwayatkan bahwa Nabi shallallahu \'alaihi wa sallam mengajarkan pembagian warisan sesuai dengan yang telah ditentukan syariat dan melarang wasiat lebih dari sepertiga harta.',
      relevance:
        'Menjadi salah satu dasar batas maksimal wasiat sebesar 1/3 dari harta peninggalan.'
    }
  ],
  khi: {
    title: 'Kompilasi Hukum Islam (KHI)',
    section: 'Buku II — Hukum Kewarisan',
    note:
      'KHI adalah pedoman hukum positif yang digunakan di lingkungan peradilan agama di Indonesia. KHI TIDAK sama dengan teks Al-Qur\'an atau hadis — KHI merupakan hasil kompilasi fiqih yang disesuaikan untuk konteks hukum nasional. Aplikasi ini menandai setiap ketentuan yang bersumber dari KHI secara terpisah dari ayat/hadis.',
    articles: [
      {
        article: 'Pasal 176 KHI',
        text_summary:
          'Mengatur bagian anak laki-laki dan anak perempuan (2:1) serta bagian anak perempuan tunggal (1/2) dan dua anak perempuan atau lebih (2/3), sejalan dengan QS. An-Nisa: 11.'
      },
      {
        article: 'Pasal 180–181 KHI',
        text_summary:
          'Mengatur bagian duda (suami) dan janda (istri), sejalan dengan QS. An-Nisa: 12.'
      },
      {
        article: 'Pasal 195 KHI',
        text_summary:
          'Mengatur batas wasiat maksimal sepertiga (1/3) harta warisan, kecuali seluruh ahli waris menyetujui lebih dari itu.'
      }
    ]
  },
  fiqhDifferences: [
    {
      topic: 'Kakek bersama saudara kandung/seayah',
      note:
        'Ulama berbeda pendapat mengenai kedudukan kakek (ayah dari ayah) ketika bersamaan dengan saudara kandung/seayah pewaris. Sebagian ulama (mengikuti pendapat Abu Bakr, Ibn Abbas) berpendapat kakek TIDAK menghalangi saudara — keduanya saling berbagi (muqasamah). Sebagian ulama lain (mengikuti pendapat Zaid bin Tsabit dan mazhab yang diikuti dalam praktik KHI) menempatkan kakek menggantikan posisi ayah sehingga menghalangi saudara. Aplikasi ini, demi kesederhanaan dan konsistensi dengan praktik yang umum di Indonesia, MENGIKUTI pendapat kedua (kakek menghalangi saudara) — silakan konsultasikan kasus nyata kepada ahli faraidh jika pendapat pertama yang diinginkan.'
    },
    {
      topic: 'Radd (pengembalian sisa) kepada pasangan (suami/istri)',
      note:
        'Mayoritas fuqaha klasik berpendapat suami/istri TIDAK ikut menerima radd (kecuali ia satu-satunya ahli waris yang tersisa). Sebagian praktik kontemporer/KHI cenderung lebih fleksibel. Aplikasi ini mengikuti pendapat mayoritas: radd tidak diberikan kepada pasangan kecuali ia ahli waris tunggal yang tersisa.'
    },
    {
      topic: 'Cucu (dari anak laki-laki) dan cicit',
      note:
        'Perhitungan bagian cucu ketika anak laki-laki pewaris sudah meninggal lebih dulu (ahli waris pengganti) memiliki kaidah fiqih tersendiri dan berbeda dengan Kompilasi Hukum Islam Pasal 185 (mawali/ahli waris pengganti) dari sisi hukum positif. Fitur ini BELUM diimplementasikan secara penuh pada versi aplikasi ini; struktur data sengaja dibuat agar mudah dikembangkan untuk kasus tersebut di kemudian hari.'
    }
  ]
};

window.REFERENCES = REFERENCES;