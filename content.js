/* ============================================================
   THIS IS THE ONLY FILE YOU NEED TO EDIT TO ADD OR CHANGE WORKS.
   See README.md for a walkthrough.

   A work looks like this:

   {
     id: "unique-english-slug",        // required, becomes work.html?work=unique-english-slug
     title: "عنوان",                    // required
     language: "ur",                   // "ur" = Nastaleeq, "ar" = Naskh, "en" = English
     kind: "رسالہ",                     // small label: رسالہ / چارٹ / پریزینٹیشن / ترجمہ و تخریج / مضمون / فتویٰ
     description: "One or two lines.",  // optional
     tags: ["حج و عمرہ"],               // optional, also searchable
     files: [                           // optional; leave out entirely if nothing is uploaded yet
       { label: "Urdu PDF", url: "files/my-file.pdf" },
       { label: "English PDF", url: "https://drive.google.com/..." }
     ]
   }

   A work with no `files` shows as "Not published yet" instead of a
   download button. That is normal and safe — add the files later.
   ============================================================ */

window.siteContent = {
  site: {
    name: "Abul Laith Muhammad Tahir Qadri Al-Naeemi",
    nameUr: "أبو اللّیث محمد طاہر القادری النّعیمی",
    email: "tahir.razavi@gmail.com",
    // Used for sharing previews, canonical links and structured data.
    // Change this if the site later moves to its own domain — and change
    // robots.txt and sitemap.xml with it.
    baseUrl: "https://tahirqadri88.github.io/PersonalWebsite/"
  },

  categories: [
    {
      id: "talifat",
      title: "Authored booklets",
      titleUr: "رسائل و تالیفات",
      blurb: "Original research and teaching booklets.",
      works: [
        {
          id: "saa-ki-tahqeeq",
          title: "صاع کی تحقیق",
          language: "ur",
          kind: "رسالہ",
          description:
            "Establishes the weight of a ṣāʿ in modern units from Fatāwā Raḍawiyya, working through the tola and bhar to a figure in grams, with a documented appendix on the standardised tola.",
          tags: ["اصولِ افتاء", "صدقۃ الفطر", "اوزان"],
          files: [{ label: "Urdu PDF", url: "files/booklets-authored/saa-ki-tahqeeq.pdf" }]
        },
        {
          id: "ilm-ul-meerath",
          title: "علم المیراث — رسالہ اور پریزینٹیشن سلائڈز",
          language: "ur",
          kind: "رسالہ و پریزینٹیشن",
          description: "A short modern treatment of the law of inheritance, with the accompanying teaching slides.",
          tags: ["میراث", "تدریس"]
          // files: [{ label: "Urdu PDF", url: "files/ilm-ul-meerath.pdf" },
          //         { label: "Slides", url: "files/ilm-ul-meerath-slides.pdf" }]
        },
        {
          id: "asbab-e-saba",
          title: "اسبابِ سبعہ کی تفصیل",
          language: "ur",
          kind: "رسالہ",
          description:
            "A study of the seven grounds recognised in fatwā — ḍarūra, ḥāja, dafʿ-e-ḥaraj, ʿumūm-e-balwā and the rest. Part of the سلسلہءِ رسائل: اُصولِ افتاء series.",
          tags: ["اصولِ افتاء", "سلسلہ اصولِ افتاء"]
        },
        {
          id: "sai-ul-ifham",
          title: "سعى الإفهام تلخيص أجلى الإعلام",
          language: "ar",
          kind: "تلخیص",
          description: "A restructured summary of Aʿlā Ḥaḍrat's أجلى الإعلام.",
          tags: ["اصولِ افتاء"],
          files: [
            {
              label: "Arabic PDF",
              url: "files/study-notes-for-specialization-students-of-hanafi-fiqh/sai-ul-ifham.pdf"
            }
          ]
        },
        {
          id: "khutba-hajjatul-wida",
          title: "خطبہءِ حجۃ الوداع کی ریکارڈنگ کے دعوے کی حقیقت",
          language: "ur",
          kind: "تحقیقی رسالہ",
          description: "An examination of the claim that the Farewell Sermon was recorded — in the light of Sharīʿa, reason and science.",
          tags: ["تحقیق", "عصری مسائل"],
          files: [{ label: "Urdu PDF", url: "files/booklets-authored/khutba-hajjatul-wida.pdf" }]
        }
      ]
    },

    {
      id: "tahqeeq",
      title: "Edited & annotated manuscripts",
      titleUr: "تحقیق، تخریج و ترجمہ",
      blurb: "Rare Ḥanafī treatises, translated and referenced with notes on their authors.",
      works: [
        {
          id: "al-ithaf-fazail-tawaf",
          title: "الإتحاف في الأحاديث الواردة في فضائل الطواف",
          language: "ar",
          kind: "ترجمہ و تخریج",
          description:
            "Translation, takhrīj and notes on the treatise of the Muftī of Makka, Shaykh al-Islām Burhān al-Dīn Ibrāhīm b. Ḥusayn, known as Bīrī Zāda.",
          tags: ["حج و عمرہ", "طواف", "بیری زادہ"],
          files: [{ label: "Urdu PDF", url: "files/researched-upon-booklets/al-ithaf-fazail-tawaf.pdf" }]
        },
        {
          id: "bustan-bani-amir",
          title: "جواب عن دخول بُستان بني عامر للتخلص من الإحرام",
          language: "ar",
          kind: "ترجمہ و تخریج",
          description:
            "On someone who passes the mīqāt intending Bustān Banī ʿĀmir or another place in the Ḥill — translated and referenced from the treatise of Bīrī Zāda.",
          tags: ["حج و عمرہ", "احرام", "میقات", "بیری زادہ"],
          files: [{ label: "Urdu PDF", url: "files/researched-upon-booklets/bustan-bani-amir.pdf" }]
        },
        {
          id: "bay-al-hayawan",
          title: "رسالة في عدم جواز بيع الحيوان بالحيوان نسيئة",
          language: "ar",
          kind: "ترجمہ و تخریج",
          description:
            "Translation, introduction, takhrīj and marginal notes on the treatise of ʿAllāma Akmal al-Dīn al-Bābartī, author of ʿInāya Sharḥ al-Hidāya, on selling an animal for an animal on deferred terms.",
          tags: ["بیوع", "بابرتی"],
          files: [{ label: "Urdu PDF", url: "files/researched-upon-booklets/bay-al-hayawan.pdf" }]
        }
      ]
    },

    {
      id: "charts",
      title: "Charts & pamphlets",
      titleUr: "نقشہ جات و معلوماتی پمفلٹس",
      blurb: "Single-sheet references for quick consultation.",
      works: [
        {
          id: "ihram-charts",
          title: "احرامِ حج و عمرہ کے مسائل کے نقشہ جات و چارٹس",
          language: "ur",
          kind: "چارٹس",
          description: "Reference charts for the rulings of iḥrām in Hajj and ʿUmra.",
          tags: ["حج و عمرہ", "احرام"]
        },
        {
          id: "roza-ka-naqsha",
          title: "روزے کے اہم مسائل کا نقشہ",
          language: "ur",
          kind: "نقشہ",
          description: "A one-page map of the important rulings of fasting.",
          tags: ["روزہ", "رمضان"]
        }
      ]
    },

    {
      id: "maqalat",
      title: "Articles & responses",
      titleUr: "مضامین و جوابات",
      blurb: "Shorter pieces and replies to contemporary objections.",
      works: [
        {
          id: "arafat-mazhar-jawabat",
          title: "عرفات مظہر کی طرف سے غیر مسلم گستاخ سے متعلق احناف کے مؤقف پر اشکالات کے جوابات",
          language: "ur",
          kind: "مضمون",
          description: "Replies to objections raised against the Ḥanafī position.",
          tags: ["احناف", "جوابات"]
        },
        {
          id: "halloween",
          title: "ھیلو وین کا تہوار اور مسلمان",
          language: "ur",
          kind: "مضمون",
          description: "What Muslims should know about Halloween.",
          tags: ["عصری مسائل"],
          files: [
            { label: "Part 1", url: "files/social-media-posts-and-pamphlets/halloween-part-1.jpg" },
            { label: "Part 2", url: "files/social-media-posts-and-pamphlets/halloween-part-2.jpg" },
            { label: "Part 3", url: "files/social-media-posts-and-pamphlets/halloween-part-3.jpg" }
          ]
        }
      ]
    }
  ],

  /* Fatāwā. Same fields as a work — id, title, language, description, files. */
  rulings: [
    {
      id: "zakat-tax-credit",
      title: "Tax credit on zakat paid to non-profit organisations",
      language: "en",
      description: "Whether claiming a tax credit affects the validity of zakat paid to a registered non-profit.",
      files: [{ label: "Urdu PDF", url: "files/my-fatawa/zakat-tax-credit-urdu.pdf" }]
    },
    {
      id: "commodity-exchange",
      title: "Commodity exchange",
      language: "en",
      description: "Available in Urdu and English.",
      tags: ["بیوع"],
      files: [
        { label: "Urdu PDF", url: "files/my-fatawa/commodity-exchange-urdu.pdf" },
        { label: "English PDF", url: "files/my-fatawa/commodity-exchange-english.pdf" }
      ]
    },
    {
      id: "wealth-abdul-rehman-ibn-auf",
      title: "The wealth of Sayyidunā ʿAbd al-Raḥmān ibn ʿAwf",
      language: "en",
      description: "Available in Urdu and English.",
      files: [
        { label: "Urdu PDF", url: "files/my-fatawa/wealth-abdul-rehman-ibn-auf-urdu.pdf" },
        { label: "English PDF", url: "files/my-fatawa/wealth-abdul-rehman-ibn-auf-english.pdf" }
      ]
    },
    {
      id: "qata-taalluq",
      title: "قطعِ تعلق کی ایک صورت پر فتویٰ",
      language: "ur",
      files: [{ label: "Urdu PDF", url: "files/my-fatawa/qata-taalluq.pdf" }]
    },
    {
      id: "aik-hadees-ka-matlab",
      title: "ایک حدیث کا مطلب",
      language: "ur",
      files: [{ label: "English PDF", url: "files/my-fatawa/aik-hadees-ka-matlab-english.pdf" }]
    }
  ]
};
