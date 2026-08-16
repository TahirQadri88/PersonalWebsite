/* ============================================================
   THIS IS THE ONLY FILE YOU NEED TO EDIT TO ADD OR CHANGE WORKS.
   See README.md for a walkthrough, or open admin.html to edit it
   through a form instead of by hand.

   A work looks like this:

   {
     id: "unique-english-slug",        // required, becomes work.html?work=unique-english-slug
     title: "عنوان",                    // required
     language: "ur",                   // "ur" = Nastaleeq, "ar" = Naskh, "en" = English
     kind: "رسالہ",                     // small label: رسالہ / چارٹ / پریزینٹیشن / ترجمہ و تخریج / مضمون / فتویٰ
     description: "One or two lines.",  // optional, English
     descriptionUr: "وہی بات اردو میں۔", // optional; on an Urdu work it
                                        // is shown first, English under it
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
    name: "Abul Laith Muhammad Tahir Qadri An-Naeemi",
    nameUr: "أبو اللّیث محمد طاہر القادری النّعیمی",
    email: "tahir.razavi@gmail.com",
    // Used for sharing previews, canonical links and structured data.
    // Change this if the site later moves to its own domain — and change
    // robots.txt and sitemap.xml with it.
    baseUrl: "https://tahirqadri.com.pk/"
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
          description: "Establishes the weight of a ṣāʿ in modern units from Fatāwā Raḍawiyya, working through the tola and bhar to a figure in grams, with a documented appendix on the standardised tola.",
          descriptionUr: "فقہ حنفی اور فتاویٰ رضویہ کی روشنی میں صاع کا وزن جدید اوزان (گرام، کلو گرام) میں متعین کیا گیا ہے۔ تولہ اور بھر سے ہوتے ہوئے گرام تک حساب پیش کیا گیا ہے، اور آخر میں معیاری تولہ پر ایک مستند ضمیمہ شامل ہے۔",
          tags: ["اصولِ افتاء", "صدقۃ الفطر", "اوزان"],
          files: [
            { label: "Urdu PDF", url: "files/booklets-authored/saa-ki-tahqeeq.pdf" }
          ]
        },
        {
          id: "khutba-hajjatul-wida",
          title: "خطبہءِ حجۃ الوداع کی ریکارڈنگ کے دعوے کی حقیقت",
          language: "ur",
          kind: "تحقیقی رسالہ",
          description: "An examination of the claim that the Farewell Sermon was recorded — in the light of Sharīʿa, reason and science.",
          descriptionUr: "خطبۂ حجۃ الوداع کی ریکارڈنگ کے دعوے کا شرعی، عقلی اور سائنسی اعتبار سے جائزہ۔",
          tags: ["تحقیق", "عصری مسائل"],
          files: [
            { label: "Urdu PDF", url: "files/booklets-authored/khutba-hajjatul-wida.pdf" }
          ]
        },
        {
          id: "nfts",
          title: "این ایف ٹیز N.F.Ts (نان فنجیبل ٹوکنز) — شرعی نقطۂ نگاہ سے ایک تجزیہ",
          language: "ur",
          kind: "فتویٰ",
          description: "A ruling on non-fungible tokens in Ḥanafī fiqh, issued as a fatwā and published as a booklet.",
          descriptionUr: "نان فنجیبل ٹوکنز (این ایف ٹیز) کے بارے میں فقہِ حنفی کی روشنی میں تحقیقی فتویٰ، جو بعد ازاں رسالے کی صورت میں شائع ہوا۔",
          tags: ["عصری مسائل", "بیوع"],
          files: [
            { label: "Urdu PDF", url: "files/booklets-authored/nfts.pdf" }
          ]
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
          description: "Translation, takhrīj and notes on the treatise of the Muftī of Makka, Shaykh al-Islām Burhān al-Dīn Ibrāhīm b. Ḥusayn, known as Bīrī Zāda.",
          descriptionUr: "مفتیِ مکہ شیخ الاسلام برہان الدین ابراہیم بن حسین المعروف بہ بیری زادہ کے رسالے کا ترجمہ، تخریج اور حواشی۔",
          tags: ["حج و عمرہ", "طواف", "بیری زادہ"],
          files: [
            { label: "Urdu PDF", url: "files/researched-upon-booklets/al-ithaf-fazail-tawaf.pdf" }
          ]
        },
        {
          id: "bustan-bani-amir",
          title: "جواب عن دخول بُستان بني عامر للتخلص من الإحرام",
          language: "ar",
          kind: "ترجمہ و تخریج",
          description: "On someone who passes the mīqāt intending Bustān Banī ʿĀmir or another place in the Ḥill — translated and referenced from the treatise of Bīrī Zāda.",
          descriptionUr: "جو شخص میقات سے بستانِ بنی عامر یا حِل کے کسی اور مقام کے ارادے سے گزرے، اُس کے حکم پر مفتیِ مکہ شیخ الاسلام برہان الدین ابراہیم بن حسین المعروف بہ بیری زادہ کے رسالے کا ترجمہ و تخریج۔",
          tags: ["حج و عمرہ", "احرام", "میقات", "بیری زادہ"],
          files: [
            { label: "Urdu PDF", url: "files/researched-upon-booklets/bustan-bani-amir.pdf" }
          ]
        },
        {
          id: "bay-al-hayawan",
          title: "رسالة في عدم جواز بيع الحيوان بالحيوان نسيئة",
          language: "ar",
          kind: "ترجمہ و تخریج",
          description: "Translation, introduction, takhrīj and marginal notes on the treatise of ʿAllāma Akmal al-Dīn al-Bābartī, author of ʿInāya Sharḥ al-Hidāya, on selling an animal for an animal on deferred terms.",
          descriptionUr: "صاحبِ عنایہ شرح الہدایہ علّامہ اکمل الدین بابرتی کے رسالے کا ترجمہ، مقدمہ، تخریج اور حواشی — جانور کے بدلے جانور کی اُدھار بیع کے حکم پر۔",
          tags: ["بیوع", "بابرتی"],
          files: [
            { label: "Urdu PDF", url: "files/researched-upon-booklets/bay-al-hayawan.pdf" }
          ]
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
          descriptionUr: "حج و عمرہ کے احرام سے متعلق مسائل کے نقشہ جات، ایک نظر میں دیکھنے کے لیے۔",
          tags: ["حج و عمرہ", "احرام"],
          files: [
            { label: "احرام کیا ہے", url: "files/presentations/hajj-charts/01-ehram-kya-hai.pdf" },
            { label: "میقات اور حدودِ حرم", url: "files/presentations/hajj-charts/02-meeqat-aur-hudood-e-haram.pdf" },
            { label: "احرام کے حرام کام", url: "files/presentations/hajj-charts/03-ehram-ke-haraam-kaam.pdf" },
            { label: "مکروہاتِ احرام", url: "files/presentations/hajj-charts/04-makroohat-e-ehram.pdf" },
            { label: "احرام کے جائز کام", url: "files/presentations/hajj-charts/05-ehram-ke-jaaiz-kaam.pdf" },
            { label: "جرم اور کفارے", url: "files/presentations/hajj-charts/06-jurm-aur-kaffaray.pdf" }
          ]
        },
        {
          id: "roza-ka-naqsha",
          title: "روزے کے اہم مسائل",
          language: "ur",
          kind: "پریزینٹیشن",
          description: "A teaching presentation on the important rulings of fasting.",
          descriptionUr: "روزہ  ٹوٹنے کے اہم مسائل پر معلوماتی ، مختصر اور جامع  پریزینٹیشن۔",
          tags: ["روزہ", "رمضان"],
          files: [
            { label: "Urdu PDF", url: "files/presentations/roza-ke-ahem-masail.pdf" }
          ]
        },
        {
          id: "halloween",
          title: "ھیلو وین کا تہوار اور مسلمان",
          language: "ur",
          kind: "معلوماتی پمفلٹ",
          description: "What Muslims should know about Halloween.",
          descriptionUr: "ہیلو وین کے تہوار کے بارے میں مسلمانوں کے لیے ضروری معلومات۔",
          tags: ["عصری مسائل"],
          files: [
            { label: "Part 1", url: "files/social-media-posts-and-pamphlets/halloween-part-1.jpg", preview: "files/social-media-posts-and-pamphlets/halloween-part-1-preview.jpg" },
            { label: "Part 2", url: "files/social-media-posts-and-pamphlets/halloween-part-2.jpg", preview: "files/social-media-posts-and-pamphlets/halloween-part-2-preview.jpg" },
            { label: "Part 3", url: "files/social-media-posts-and-pamphlets/halloween-part-3.jpg", preview: "files/social-media-posts-and-pamphlets/halloween-part-3-preview.jpg" }
          ]
        }
      ]
    },

    {
      id: "ilmi-mawad",
      title: "Study material",
      titleUr: "تخصص فی الفقہ کے طلباء کے لئے آسان علمی مواد",
      blurb: "Prepared for students of Takhaṣṣuṣ fil Fiqh — slides, summaries and notes.",
      works: [
        {
          id: "ilm-ul-meerath",
          title: "علم المیراث — تدریسی پریزینٹیشن سلائڈز",
          language: "ur",
          kind: "رسالہ و پریزینٹیشن",
          description: "A short modern treatment of the law of inheritance, with the accompanying teaching slides.",
          descriptionUr: "علمِ میراث پر ایک مختصر جدید تحریر، ہمراہ تدریسی پریزینٹیشن سلائڈز۔",
          tags: ["میراث", "تدریس"],
          files: [
            { label: "Slides — colour print", url: "files/presentations/ilm-ul-meerath-slides-colour.pdf" },
            { label: "Slides — printable", url: "files/presentations/ilm-ul-meerath-slides-printable.pdf" }
          ]
        },
        {
          id: "asbab-e-saba",
          title: "اسبابِ سبعہ کی تفصیل",
          language: "ur",
          kind: "رسالہ",
          description: "A study of the seven grounds recognised in fatwā — ḍarūra, ḥāja, dafʿ-e-ḥaraj, ʿumūm-e-balwā and the rest. Part of the سلسلہءِ رسائل: اُصولِ افتاء series.",
          descriptionUr: "فتویٰ میں معتبر سات اسباب — ضرورت، حاجت، دفعِ حرج، عمومِ بلویٰ اور دیگر — کی تفصیل۔ سلسلہءِ رسائل: اُصولِ افتاء کا ایک رسالہ۔",
          tags: ["اصولِ افتاء", "سلسلہ اصولِ افتاء"],
          files: [
            { label: "Urdu PDF", url: "files/study-notes-for-specialization-students-of-hanafi-fiqh/asbab-e-saba.pdf" }
          ]
        },
        {
          id: "sai-ul-ifham",
          title: "سعى الإفهام تلخيص أجلى الإعلام",
          language: "ar",
          kind: "تلخیص",
          description: "A restructured summary of Aʿlā Ḥaḍrat's أجلى الإعلام.",
          descriptionUr: "اعلیٰ حضرت رحمۃ اللہ علیہ کے رسالے أجلى الإعلام کی، ترتیبِ نو کے ساتھ، تلخیص۔",
          tags: ["اصولِ افتاء"],
          files: [
            { label: "Arabic PDF", url: "files/study-notes-for-specialization-students-of-hanafi-fiqh/sai-ul-ifham.pdf" }
          ]
        }
      ]
    },

    {
      id: "posts",
      title: "Posts, Notes & Reflections",
      titleUr: "مضامین و خیالات",
      blurb: "Shorter pieces written as they come.",
      works: [
        {
          id: "books-that-arent-coming-back",
          title: "The Books That Aren’t Coming Back",
          language: "en",
          kind: "مضمون",
          date: "2026-08-04",
          description: "Books are being bought and shredded to feed machines — what the court allowed, what it cost, and why a printed copy still matters.",
          descriptionUr: "‏کتابیں خرید کر مشین کی خوراک بنائی جا رہی ہیں: عدالت نے کیا جائز ٹھہرایا، تاوان کتنا پڑا، اور چھپی ہوئی کتاب اب بھی کیوں ضروری ہے۔",
          tags: ["Books", "Artificial Intelligence", "Copyright", "Print"],
          page: "posts/books-that-arent-coming-back.html"
        },
        {
          id: "kitabein-mashin-ki-khurak",
          title: "کتابیں خرید کر کاٹی جا رہی ہیں، مشین کی خوراک کے لیے",
          language: "ur",
          kind: "مضمون",
          date: "2026-08-04",
          description: "The Urdu version: books bought and pulped to feed machines, and why a book on the shelf depends on no server.",
          descriptionUr: "کتابیں خرید کر گودے میں بدلی جا رہی ہیں، اور الماری کی کتاب کسی سرور کی محتاج نہیں۔",
          tags: ["کتاب", "مصنوعی ذہانت", "حقوقِ اشاعت", "طباعت"],
          page: "posts/kitabein-mashin-ki-khurak.html"
        },
        {
          id: "alfaz-ka-intikhab",
          title: "الفاظ کا انتخاب",
          language: "ur",
          kind: "مضمون",
          date: "2026-08-03",
          description: "Importance of Choosing the Right Words and Avoiding Wrong Words",
          descriptionUr: "‏سچی بات بھی اگر بےموقع الفاظ میں کہی جائے تو لوگ اسے سننے سے پہلے ہی رد کر دیتے ہیں۔ پہلے لباس دیکھا جاتا ہے، پھر مضمون۔",
          tags: ["Choose Your Words Wisely", "سوشل میڈیا پوسٹ"],
          page: "posts/choice-of-words.html"
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
          descriptionUr: "احناف کے مؤقف پر اُٹھائے گئے اشکالات کے جوابات۔",
          tags: ["احناف", "جوابات"],
          files: [
            { label: "English PDF", url: "files/study-notes-for-specialization-students-of-hanafi-fiqh/arafat-mazhar-jawabat-english.pdf" }
          ]
        },
        {
          id: "reservations-shariah-screening-stocks",
          title: "شیئرز کی شرعی اسکریننگ پر تحفظات",
          language: "ur",
          kind: "مضمون",
          date: "2026-08-08",
          description: "Reservations on conventional Shariah Screening of Stocks",
          descriptionUr: "کیا شیئرز  کی شرعی اسکریننگ (جانچ)   کا مروّجہ معیار ، ان  کو شرعاً جائز قرار دینے کے لیے کافی ہے؟",
          tags: ["سودی", "کمپنی", "شرعی", "اسکریننگ", "فیصدی", "شیئرز"],
          page: "posts/reservations-shariah-screening-stocks.html"
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
      description: "A ruling on taking tax credits from governments and tax authorities for zakāt — obligatory charity — given to certain approved organisations.",
      descriptionUr: "بعض منظور شدہ اداروں کو دی گئی زکوٰۃ پر حکومت یا محکمۂ ٹیکس سے ٹیکس کریڈٹ لینے کے حکم پر فتویٰ۔",
      files: [
        { label: "Urdu PDF", url: "files/my-fatawa/zakat-tax-credit-urdu.pdf" }
      ]
    },
    {
      id: "commodity-exchange",
      title: "Commodity exchange",
      language: "en",
      description: "A ruling on futures and forward transactions in commodities — in commodities trading and on the exchanges.",
      descriptionUr: "اجناس کے فیوچرز اور فارورڈ سودوں کے حکم پر فتویٰ — اجناس کی تجارت میں اور کموڈیٹی ایکسچینج پر۔",
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
      description: "What his net worth came to in present-day value and in dollar terms, and how he used it.",
      descriptionUr: "حضرت سیّدنا عبد الرحمٰن بن عوف رضی اللہ عنہ کے کل اثاثے موجودہ قیمت اور ڈالر کے حساب سے کتنے بنتے ہیں، اور آپ نے انہیں کہاں خرچ کیا۔",
      files: [
        { label: "Urdu PDF", url: "files/my-fatawa/wealth-abdul-rehman-ibn-auf-urdu.pdf" },
        { label: "English PDF", url: "files/my-fatawa/wealth-abdul-rehman-ibn-auf-english.pdf" }
      ]
    },
    {
      id: "qata-taalluq",
      title: "قطعِ تعلق کی ایک صورت پر فتویٰ",
      language: "ur",
      description: "A fatwa on a legitimate case of cutting ties with relatives",
      descriptionUr: "رشتہ داروں سے قطعِ تعلق کی ایک جائز صورت پر فتویٰ",
      files: [
        { label: "Urdu PDF", url: "files/my-fatawa/qata-taalluq.pdf" }
      ]
    },
    {
      id: "aik-hadees-ka-matlab",
      title: "An Explanatory Study of Specific Terms Used in a Hadith of Ṣaḥīḥ al-Bukhārī",
      language: "en",
      description: "On the wording of a hadith in Ṣaḥīḥ al-Bukhārī — a duʿā for the deceased, واغسله بالماء والثلج والبرد, “and wash him with water, snow and hail” — and why three forms of water are named where cleansing alone would have been said.",
      descriptionUr: "صحیح البخاری میں میّت کے لیے دعا کے الفاظ ”واغسلہ بالماء والثلج والبرد“ (اور اسے پانی، برف اور اولوں سے دھو دے) کے بارے میں سوال — کہ محض دھونے کے ذکر پر اکتفا کے بجائے پانی کی تین صورتوں کا ذکر کیوں فرمایا گیا۔",
      tags: ["حدیث", "دعا"],
      files: [
        { label: "English PDF", url: "files/my-fatawa/aik-hadees-ka-matlab-english.pdf" }
      ]
    }
  ]
};

/* A search index, generated at publish time from a post's own words —
   not meant to be hand-edited, and not part of the record above because
   the words themselves live in the post's own HTML file, not here. Only
   posts get an entry: a work or a fatwa's content is inside a PDF, which
   this cannot read into. */
window.siteContent.searchIndex = {
  "books-that-arent-coming-back": {
    "text": "Millions of books were bought, then cut apart In a warehouse, a machine takes the spine off a book, the loose pages run through a scanner, and the paper goes to recycling. The American company Anthropic did this to millions of print books it had purchased, to train its AI model. Court documents show it hired Tom Turvey, formerly of Google Books, in February 2024 and tasked him with obtaining “all the books in the world.” [1] A judge ruled that destroying the book made it legal In June 2025 a US district judge, William Alsup, found the practice lawful. Once you buy a book it is yours, and because the paper original was destroyed, the scan didn’t add a copy, it replaced one. The uncomfortable part sits right there. Had the company kept the books on a shelf, it would have held two copies and broken the law. Shredding them is what kept it legal. [2] Seven million pirated books cost $1.5 billion Before it bought anything, the same company had already pulled more than seven million books off piracy sites. [3] The judge drew a hard line there, and it ended in a $1.5 billion settlement: roughly $3,000 per book across more than 400,000 works. [4] Anything printed before 2022 is now the prize So much writing online is machine-produced that models risk feeding on their own output, and quality degrades. Books printed before 2022 carry none of that contamination, which is what makes old stock valuable. 404 Media reported in July 2026 that one company was offering AI firms bulk orders of 1,000 to a million books. That company later removed the page and said no such service ever launched. In the same report, a bookseller said the orders clear stock that would never sell, but that uncommon books are being pulped. [5] Who else is doing this, beyond Anthropic, is not established. Snopes rated the wider claim mostly true, with parts undetermined. [6] 64% of Americans still read print Pew Research Center asked US adults in October 2025 what they had read in the past year. 64% had read a print book, 31% an e-book, 26% an audiobook. Print is the only format a majority still uses. [7] A book on your shelf depends on no server Digitisation was sold to us as preservation. What happened instead was that money was spent to buy books and turn them into pulp. A digital copy survives only as long as someone keeps paying for the server; it can be edited or quietly removed, and you will not be told. Buy the hard copy, and keep it. Especially the ones nobody will reprint. Sources [1] Benj Edwards, “Anthropic destroyed millions of print books to build its AI models,” Ars Technica, 25 June 2025. arstechnica.com/ai/2025/06/anthropic-destroyed-millions-of-print-books-to-build-its-ai-models/ [2] “Federal Judge Rules AI Training Is Fair Use in Anthropic Copyright Case,” Publishers Weekly, 25 June 2025 — Bartz v. Anthropic, N.D. Cal. publishersweekly.com/pw/by-topic/digital/copyright/article/98089-federal-judge-rules-ai-training-is-fair-use-in-anthropic-copyright-case.html [3] “Mixed Decision in Anthropic AI Case,” The Authors Guild. authorsguild.org/news/mixed-decision-in-anthropic-ai-case/ [4] Associated Press, “Anthropic pays $1.5B to authors in Claude AI copyright settlement over pirated books” — final approval 20 July 2026. aol.com/articles/anthropic-pays-1-5b-authors-170300000.html [5] Samantha Cole, “AI Companies Are Buying Tons of Old Books Because They’re Free of AI Slop,” 404 Media, 21 July 2026. [6] “Are AI companies scanning and destroying millions of books, including rare titles?” Snopes. snopes.com/fact-check/ai-companies-destroying-rare-books/ [7] “Do Americans read print books, e-books or audiobooks more?” Pew Research Center — survey October 2025, published 9 April 2026. pewresearch.org/short-reads/2026/04/09/americans-still-opt-for-print-books-over-digital-or-audio-versions-few-are-in-book-clubs/"
  },
  "kitabein-mashin-ki-khurak": {
    "text": "‏لاکھوں کتابیں خرید کر کاٹی گئیں ‏گودام میں ایک مشین کتاب کی جلد کاٹتی ہے، کھلے صفحات اسکینر سے گزرتے ہیں، اور کاغذ ردی میں چلا جاتا ہے۔ امریکی کمپنی اینتھراپک (Anthropic) نے لاکھوں چھپی ہوئی کتابیں خرید کر یہی کیا، تاکہ اپنے مصنوعی ذہانت کے ماڈل کو تربیت دے سکے۔ عدالتی کاغذات کے مطابق کمپنی نے فروری 2024ء میں گوگل بکس کے سابق ذمہ دار ٹام ٹروی (Tom Turvey) کو ملازم رکھا اور ذمہ داری دی کہ ”دنیا کی تمام کتابیں“ حاصل کرے۔ [۱] ‏جج نے کتاب کے تلف کرنے کو جائز قرار دیا ‏جون 2025ء میں امریکی ضلعی عدالت کے جج ولیم ایلسپ (William Alsup) نے یہ عمل جائز ٹھہرایا۔ دلیل یہ تھی کہ خریدی ہوئی کتاب خریدار کی ملکیت ہے، اور جب اصل نسخہ ختم کر دیا گیا تو ڈیجیٹل نسخے نے اس کی جگہ لے لی، نقلوں میں اضافہ نہیں ہوا۔ ‏کھٹکنے والی بات اسی میں ہے: اگر کمپنی کتابیں سنبھال کر رکھ لیتی تو اس کے پاس دو نقلیں ہوتیں اور یہی عمل خلافِ قانون ٹھہرتا۔ یعنی کتاب کا تلف کر دینا ہی اسے قانونی بنا گیا۔ [۲] ‏چوری شدہ ستر لاکھ کتابوں پر ڈیڑھ ارب ڈالر کا تاوان ‏خریداری شروع کرنے سے پہلے یہی کمپنی ستر لاکھ سے زائد کتابیں چوری کی ویب سائٹوں سے اتار چکی تھی۔ [۳] اس پر جج نے دو ٹوک فیصلہ دیا اور معاملہ ڈیڑھ ارب ڈالر کے تصفیے پر ختم ہوا، چار لاکھ سے زائد کتابوں پر تقریباً تین ہزار ڈالر فی کتاب۔ [۴] ‏2022ء سے پہلے کی کتاب سب سے قیمتی مال ہے ‏آج انٹرنیٹ کی بہت سی تحریر خود مشین کی لکھی ہوئی ہے، اس لیے ماڈل اپنی ہی پیداوار پر پلنے لگتے ہیں اور معیار گرتا جاتا ہے۔ 2022ء سے پہلے کی چھپی ہوئی کتاب اس آمیزش سے محفوظ ہے، اسی لیے پرانا ذخیرہ قیمتی ٹھہرا۔ ‏فور او فور میڈیا (404 Media) نے جولائی 2026ء میں بتایا کہ ایک ادارہ ایسی کمپنیوں کو ایک ہزار سے دس لاکھ کتابوں تک کے تھوک سودے پیش کر رہا تھا۔ بعد میں اس ادارے نے وہ صفحہ ہٹا دیا اور کہا کہ ایسی کوئی خدمت کبھی شروع نہیں کی گئی۔ اسی رپورٹ میں ایک کتب فروش کا کہنا تھا کہ ان سودوں سے اس کا رکا ہوا مال تو نکل جاتا ہے، مگر نایاب کتابیں گودے میں تبدیل ہو رہی ہیں۔ [۵] ‏اینتھراپک کے علاوہ کون کون یہ کر رہا ہے، اس کا ثبوت موجود نہیں؛ اسنوپس (Snopes) نے مجموعی دعوے کو بڑی حد تک درست، مگر بعض پہلوؤں میں غیر مصدقہ قرار دیا۔ [۶] ‏64 فیصد امریکی آج بھی چھپی کتاب پڑھتے ہیں ‏پیو ریسرچ سینٹر (Pew Research Center) نے اکتوبر 2025ء میں امریکی بالغوں سے پوچھا کہ گزشتہ ایک سال میں کیا پڑھا۔ 64 فیصد نے چھپی ہوئی کتاب پڑھی، 31 فیصد نے ای بک اور 26 فیصد نے آڈیو بک سنی۔ چھپی کتاب واحد صورت ہے جسے اکثریت اب بھی استعمال کرتی ہے۔ [۷] ‏الماری کی کتاب کسی سرور کی محتاج نہیں ‏ڈیجیٹل بنانے کا عمل ہمیں کتابوں کے تحفظ کے نام پر پیش کیا گیا تھا۔ ہوا یہ کہ پیسہ خرچ کر کے کتابیں خریدی گئیں اور کاغذ گودے میں بدل دیا گیا۔ ڈیجیٹل نسخہ اُس وقت تک قائم ہے جب تک کوئی سرور کا خرچ اٹھاتا رہے؛ اسے بدلا بھی جا سکتا ہے اور خاموشی سے ہٹایا بھی، اور آپ کو اطلاع تک نہ ہو گی۔ ‏چھپی ہوئی کتاب خریدیے، اور سنبھال کر رکھیے۔ خاص طور پر وہ جو دوبارہ نہیں چھپیں گی۔ ‏حوالہ جات ‏[۱] بینج ایڈورڈز، آرس ٹیکنیکا، 25 جون 2025ء Benj Edwards, “Anthropic destroyed millions of print books to build its AI models,” Ars Technica — arstechnica.com/ai/2025/06/anthropic-destroyed-millions-of-print-books-to-build-its-ai-models/ ‏[۲] پبلشرز ویکلی، 25 جون 2025ء — مقدمہ بارٹز بنام اینتھراپک، امریکی ضلعی عدالت شمالی کیلیفورنیا “Federal Judge Rules AI Training Is Fair Use in Anthropic Copyright Case,” Publishers Weekly — publishersweekly.com/pw/by-topic/digital/copyright/article/98089-federal-judge-rules-ai-training-is-fair-use-in-anthropic-copyright-case.html ‏[۳] مصنفین کی تنظیم اتھرز گلڈ (Authors Guild) “Mixed Decision in Anthropic AI Case” — authorsguild.org/news/mixed-decision-in-anthropic-ai-case/ ‏[۴] ایسوسی ایٹڈ پریس — تصفیے کی حتمی منظوری 20 جولائی 2026ء “Anthropic pays $1.5B to authors in Claude AI copyright settlement over pirated books” — aol.com/articles/anthropic-pays-1-5b-authors-170300000.html ‏[۵] سمانتھا کول، فور او فور میڈیا، 21 جولائی 2026ء Samantha Cole, “AI Companies Are Buying Tons of Old Books Because They’re Free of AI Slop,” 404 Media ‏[۶] اسنوپس فیکٹ چیک “Are AI companies scanning and destroying millions of books, including rare titles?” Snopes — snopes.com/fact-check/ai-companies-destroying-rare-books/ ‏[۷] پیو ریسرچ سینٹر — سروے اکتوبر 2025ء، اشاعت 9 اپریل 2026ء “Do Americans read print books, e-books or audiobooks more?” Pew Research Center — pewresearch.org/short-reads/2026/04/09/americans-still-opt-for-print-books-over-digital-or-audio-versions-few-are-in-book-clubs/"
  },
  "alfaz-ka-intikhab": {
    "text": "‏سچی بات بھی اگر بےموقع الفاظ میں کہی جائے تو لوگ اسے سننے سے پہلے ہی رد کر دیتے ہیں۔ پہلے لباس دیکھا جاتا ہے، پھر مضمون۔ ‏قرآن کی رہنمائی ‏قران کریم نے دعوت کا طریقہ خود مقرر فرمایا گیا: ٱدْعُ إِلَىٰ سَبِيلِ رَبِّكَ بِٱلْحِكْمَةِ وَٱلْمَوْعِظَةِ ٱلْحَسَنَةِ ۖ وَجَـٰدِلْهُم بِٱلَّتِى هِىَ أَحْسَنُ ‏(النحل: ۱۲۵) ‏”اپنے رب کے راستے کی طرف حکمت اور اچھی نصیحت کے ساتھ بلائیے، اور ان سے اس طریقے پر بحث کیجیے جو بہترین ہو۔“ ‏حکم صرف یہ نہیں کہ بلاؤ، بلکہ یہ کہ کس انداز سے بلاؤ۔ ‏غلط لفظ، غلط فہمی ‏لفظ اگر ایسا ہو جس میں دوسرے معنی کی گنجائش ہو، تو بات وہ نہیں پہنچتی جو کہی گئی تھی۔ ‏سننے والا وہ سمجھتا ہے جو لفظ سے سمجھ میں آ سکتا ہے، نہ کہ وہ جو کہنے والے کے دل میں تھا۔ ‏اس لیے نیت کی درستی کافی نہیں؛ لفظ ایسا چنا جائے جس میں غلط معنی کی گنجائش ہی نہ ہو۔ ‏الفاظ کی طاقت ‏نبی کریم ﷺ نے فرمایا: إنَّ مِنَ البَيَانِ لَسِحْرًا ‏(بخاری، کتاب الطب: ۵۷۶۷) ‏یعنی: بعض بیان (یعنی بات کو کھول کر مؤثر انداز میں کہنا) جادو ہوتا ہے۔ ‏الفاظ میں دلوں کو موڑ دینے کی طاقت ہے، اور یہی طاقت اُلٹی سمت میں بھی چلتی ہے۔ ‏ارسطو کی بات ‏صرف یہ جاننا کافی نہیں کہ کیا کہنا ہے، بلکہ یہ بھی ضروری ہے کہ اسے کیسے کہنا ہے۔ (الخطابہ ۳/۱) ‏اس کے نزدیک کلام کی دو خوبیاں ہیں: وضوح اور مناسبت (۳/۲)، اور مناسبت کی تفصیل اس نے الگ باب میں بیان کی ہے (۳/۷) — یعنی کلام نہ اتنا پست ہو کہ سبک لگے، نہ اتنا بلند کہ موقع سے بےجوڑ ہو جائے۔ ‏اصل معیار ‏ابنِ حجر رحمہ اللہ نے فتح الباری (۱۰/۲۳۸) میں فرمایا کہ علماء ایجاز (کم لفظوں میں زیادہ مضمون) کی تعریف پر متفق ہیں، اور مقامِ خطابت میں اطناب (مضمون کو کھول کر بیان کرنا) کی تعریف پر بھی — بحسب المقام (یعنی موقع کے لحاظ سے)۔ ‏فتویٰ میں اختصار، خطبے میں بسط۔ معیار مقام ہے، الفاظ کی تعداد نہیں — یہی مقتضی الحال (موقع کا تقاضا) ہے۔ ‏بلاغت کی تعریف بھی یہی ہے: مطابقة الكلام لمقتضى الحال مع فصاحته ‏یعنی کلام فصیح بھی ہو اور موقع کے مطابق بھی۔"
  },
  "reservations-shariah-screening-stocks": {
    "text": "سوال: کیا اِسٹاکس (شیئرز) کی شرعی جانچ Shariah screening کے مُروّجہ معیارات پر پورا اترنے والے کسی Index (اِنڈیکس) یا کمپنی میں سرمایہ کاری کو شرعاً جائز یا ’’ شریعت کے مطابق ‘‘ کہہ سکتے ہیں؟ (مکمل اسکریننگ کے معیارات کو AAOIFI (معیار بنانے والے ادارے ) اور PSX (پاکستان اسٹاک ایکسچینج) کی ویب سائٹ پر دیکھا جاسکتا ہے)۔ (سائل: محمد جنید، کراچی) _____________ باسمه تعالى و تقدس الجواب: مُروّجہ اسلامی شیئرز کی جانچ(Conventional Shariah Screening of Stocks) ، میں عموماً مشترکہ سرمایہ کمپنیوں (companies/corporations)کو شریعت کے مطابق قرار دینے کیلئے کچھ معیارات کا استعمال کیا جاتا ہے۔ بنیادی کاروبار کے ساتھ ساتھ کمپنیوں کے سُودی قرض کی مقدار، غیر شرعی سرمایہ کاری کی مقدار اور غیر شرعی آمدنی کی فیصد کو بھی مخصوص فیصدی حدود (percentage based financial criteria)، کے تحت جانچا جاتا ہے۔ اس سلسلے میں جب اسکریننگ (screening) معیارات، اِن کے تاریخی پس منظر اور متعلقہ شرعی و فقہی آراء کا جائزہ لیا گیا تو درج ذیل نتیجہ سامنے آتا ہے: پس منظر یہ ہے کہ اِس جانچ کے نظام کو ۹۰ء کی دہائی کے میں AAOIFI(معیار بنانے والے ادارے ) اور دیگر مالیاتی اداروں کے اشتراک سے نظام کو بہتر کرنے کی طرف ایک ابتدائی قدم کے طور پر پیش کیا تھا، لیکن سالوں گزرنے کے بعد بھی موجودہ جانچ کے معیارات اس مقام تک نہیں پہنچے کہ ان کو ’’شریعت کے مطابق‘‘ یا ’’جائز‘‘ کہنا درست ہو۔ خلاصہ یہ ہے کہ مستند اور غیر جانب دار علماء و فقہاء کے نزدیک، محض ان مالی حدود کو پورا کر لینا کسی کمپنی یا انڈیکس کو شرعاً جائز قرار دینے کے لیے کافی نہیں۔ اس کی کئی وجوہات ہیں: ۱۔ شیئر ہولڈر اپنی رضامندی سے کمپنی کا مالی شریک بن کر اس کے قانونی و آئینی نظام کا حصہ بنتا ہے۔ شیئر خریدنے والا شخص اپنی رضامندی سے کمپنی کا مالی شریک بن کر اس کے قانونی و آئینی نظام کا حصہ بنتا ہے۔ اس نظام کے تحت بورڈ (board of directors) کو کمپنی کا کاروبار چلانے، اجیر رکھنے، قرضہ لینے اور سرمایہ کاری کرنے کا اختیار حاصل ہوتا ہے۔تفصیل اس کی یہ ہے کہ: کمپنی قانون کی نظر میں الگ اعتباری تشخص artificial legal entity ضرور ہے، مگر یہ ادارہ اعتباری اور غیر عاقل ہونے کی وجہ سے خود کوئی سودا نہیں کرسکتا۔ اس کے سارے معاہدے ڈائریکٹر اور بورڈ کے نمائندے کرتے ہیں، اس سلسلہ میں قانون ڈائریکٹر زکو کمپنی کا نمائندہ اور امانت دار مانتا ہے۔ اور یہ بات مسلمہ اور معلوم ہے کہ قرض لینے کا اختیار بھی ہر کمپنی کے دستور memorandum and articles میں پہلے سے شامل مانا جاتا ہے۔(کمپنیز ایکٹ ۲۰۱۷، دفعہ ۳۰، ۲۰۱، ۲۰۴) موجودہ شرعی جانچ کے سسٹم میں کسی کمپنی کی انتظامیہ اسی تفویض شدہ اختیار کا استعمال کرتے ہوئےمشترکہ فنڈ اور اس سے لئے گئے اثاثہ جات (مُشاع ملکیت )(**) کو استعمال کرتے ہوئے کمپنی کی طرف سے سُود ادا کرے یا سُودی معاہدہ کرے تو وہ اب بھی اس مُروّجہ اسلامی اِنڈیکس کا حصہ رہے گی اور’’ شریعہ کمپلائنٹ‘‘ کہلائے گی، بشرطیکہ سودی معاہدے اور ادائیگیاں screening criteria (جانچ کے معیار) کی فیصد حدود کے اندر رہیں۔ ظاہر ہے اس بات کی رخصت نہیں دی جاسکتی، کیونکہ: عقود کے باب میں شریعت معاملے کا ظاہری نام نہیں، اس کی حقیقت دیکھتی ہے۔ اور حقیقت یہ ہے کہ کاروبار حصہ داروں کے جوڑے ہوئے سرمائے سے چل رہا ہے۔ تو نام چاہے کچھ بھی رکھ لیں، ڈائریکٹرز اور کمپنی انتظامیہ کی حیثیت بلا واسطہ کمپنی اور اعتباری طور پر بالواسطہ شیئر ہولڈرز کے مجموعی نمائندہ اور امین ہی کی ہے۔ (درر الحکام فی شرح مجلۃ الاحکام، تحت المادۃ ۳، «الْعِبْرَةُ فِي الْعُقُودِ للْمَقَاصِدِ وَالْمَعَانِي لَا لِلأَلْفَاظِ وَالْمَبَانِي»، ج۱/ص۵) خلاصہ یہ ہے کہ: اپنے مشترکہ مال میں بغیر شرعی ضرورت اور اکراہ کے جو کام آدمی اپنے نمائندے یا وکیل کے ذریعے کرائے، وہ اسی کا کیا ہوا شمار ہوتا ہے۔ کمپنی کا قرض کا معاہدہ اور اس پر سود کا لین دین بھی انہی کاموں میں ہے۔ اس لیے یہ کہنے کی گنجائش نہیں کہ حصہ دار اس سے الگ ہے۔ راضی وہ اپنے پیسے سے ہوا تھا، اور پیسہ آج بھی وہیں لگا ہے۔ اسی بنا پر اکابر علمائے کرام نے ایسے حصص میں شرکت کو ناجائز فرمایا ہے۔ جیسا کہ: مفتی اعظم پاکستان مفتی وقار الدین علیہ الرحمہ نے اپنے فتاویٰ میں اس طرح کے شیئرز میں شراکت کو ممنوع قرار دیا ۔(وقار الفتاویٰ، حضرت علامہ مفتی محمد وقار الدین قادری رضوی (مفتی اعظم پاکستان)، ۱/۲۳۴، مطبوعۃ: بزم وقار الدین، کراچی) اور مجلس شرعی مبارکپور کے فیصلوں میں بھی علماء ِاہلنست نے اسی ممانعت کے موقف پر اتفاق کیا۔حضرت تاج الشریعہ مفتی محمد اختر رضا خاں از ہری علیہ الرحمہ ، محدث کبیر مفتی ضیاء المصطفیٰ قادری، مفتی نظام الدین رضوی دام ظلہ اور کثیر علماء و فقہاء کی اس پر تصدیق موجود ہے۔ (مجلس شرعی کے فیصلے، مرتب: مفتی محمد نظام الدین رضوی برکاتی (ناظمِ مجلس شرعی و صدرِ شعبۂ افتاء جامعہ اشرفیہ، مبارک پور)، ۱/۱۴۴، مطبوعۃ: مجلس شرعی الجامعۃ الاشرفیہ، مبارک پور، ۱۴۳۵ھ-۲۰۱۴م) **مِلکِ مُشاع: شرعی اعتبار سے بھی مشترکہ ملکیت کی ایک صورت یہ ہوتی ہے کہ دو یا زائد شریک کسی چیز میں ویلیو کے حساب سےمشترکہ ملکیت رکھتے ہیں لیکن وہ چیز تقسیم نہیں ہوئی ہوتی بلکہ اس کے ایک ایک ذرہ میں دونوں کا حصہ ہوتا ہے ، ایسی کیفیت کو مُشاع اور ایسی چیز کو مِلکِ مُشاع کہتے ہیں۔(جیسے شرکاء کی مالکانہ حیثییت کسی شرکت عنان کے اثاثوں میں) ۲۔ اصل بحث صرف فیصدی مقدار کی نہیں، خود معاملے کی نوعیت ہے۔ اگر سودی قرض یا سودی آمدنی کو ایک مخصوص تناسب سے کم ہونے کی وجہ سے قابلِ قبول سمجھا جائے، تو بنیادی سوال یہ رہتا ہے کہ سودی معاملے میں داخل ہونے کی گنجائش شرعی طور پر کس بنیاد پر پیدا ہوئی؟ ۳۔ سود کی حرمت اس کی مقدار پر موقوف نہیں۔ سود کم ہو یا زیادہ، اصل حکم خود سودی معاملے سے متعلق ہے۔ محض یہ بات کہ سود ایک مقررہ فیصد سے کم ہے، اس سے سودی معاملے میں حصہ دار یا مؤکل بننے کی رخصت نہیں دی جاسکتی۔ ۴۔ کمپنیوں کا سودی قرضہ لینا ، اور اِن کمپنیوں کا شیئر ہولڈر بننا دونوں کوئی شرعی ’’ضرورت‘‘ نہیں۔ سودی قرض لینا ناجائز و حرام ہے، سوائے اس شخص کے جسے شریعت مجبور قرار دے، کیونکہ جس طرح سود لینا حرام ہے، اسی طرح دینا بھی حرام ہے۔ امام اہلسنّت امام احمد رضا خان حنفی متوفی ۱۳۴۰ھ لکھتے ہیں: ’’بغیر سخت مجبوری کے، جسے شرع بھی مجبور کہے، سودی قرض لینا حرام ہے،اور اسی طرح اس کے کام میں کسی طرح کی شرکت ہو، باعثِ گناہ ہے،اور حدیث صحیح میں:’’هُم سَوَاء‘‘فرمایا ، یعنی:’’ وہ سب نفس گناہ میں برابر ہیں‘‘،اور سود سے توبہ کے یہی معنی ہیں کہ جس قدر سود لیا واپس دے اور اللہ عزوجل سے آئندہ کےلئے سچے دل سے نادم ہوکر عہد کرے (فتاوی رضویہ، جلد 17، صفحہ 304، رضا فاؤنڈیشن، لاہور) ’’شرعی ضرورت ‘‘ اردو میں استعمال ہونے والی مجبوری نہیں، بلکہ ایک اصطلاح (technical term) ہے جس کا معنی یہ ہے کہ: ’’ضَرر یا مجبوری کی وہ حالت جس میں فعل یا ترکِ فعل پر ’’ کُلیاتِ خمسہ‘‘ (یعنی پانچ اہم چیزیں: جان، مال، دین، عقل، نسب) میں سے کسی ایک یا زائد کا ’’تحفّظ موقوف ‘‘ ہو اور اس فِعل / ترکِ فعل کے بغیر ’’ کلیاتِ خمسہ میں سے کوئی ایک یا زائد فوت ہو جائیں یا قریبِ فوت ہو جائیں‘‘۔شرعی ضرورت کی ایک تعبیر:’’ تکلیف ما لا یطاق‘‘ سے بھی کی جاتی ہے۔ ضرورت کے ثبوت اور تحقّق کی چند شرائط درج ذیل ہیں۔ ۱۔ ضرورت فی الحال متحقّق ہو۔ ۲۔ممنوع بات کا ارتکاب یا محظور کا استعمال صرف بقدر ضرورت ہو۔ ۳۔ اپنے ضرر کا ازالہ اس کی مثل ضرر سے نہ کیا جائے لہٰذا کسی مضطر کو یہ حلال نہیں کہ دوسرے مضطر کا کھانا کھا کر اپنی جان بچائے۔ ۴۔ یہ یقین یا ظن غالب ہو کہ محظور کا استعمال کُلیات خمسہ میں سے جس کُلّی کی حفاظت کے لئے کیا گیا تھا، اس کی حفاظت ہو جائے گی۔ ۵۔ ممنوع / مَحظُور کام ، حقوق اللہ سے ہو یعنی مَحظُور حقّ العباد سے نہ ہو۔ (ماخوذ مِن : فقہ اسلامی کے سات بنیادی اصول، ص ۵۸، دار النعمان، کراچی؛بحوالہ: فواتح الرحموت، فصل فی العلۃ، ج ۲، ص ۲۶۲، ط۔ مکتبۃ التراث؛ المستصفى فی علم الاصول فوق فواتح الرحموت، ج ۱، ص ۲۸۷) اس لیے یہ سوال اپنی جگہ رہتا ہے کہ جب کوئی شخص رضامندی سے کمپنی میں سرمایہ لگاتا ہے اور کمپنی اسی انتظامی اختیار کے تحت سودی معاملات کرتی ہے، تو صرف یہ کہنے سے کہ: بطور اقلیتی شیئر ہولڈر میری کوئی سنوائی نہیں ہوسکتی یا سود کی مقدار مقررّہ حد سے کم ہے، وہ اِن معاملات سے کس بنیاد پر بَرِی الذِّمَّہ ہوگا ؟ ۵۔ تطہیر (charity of impure income)کرنے سے سودی معاملات کا ابتدائی طور پر حِصہ بننا اور حُصول جائز نہیں ہو جاتا۔ غیر شرعی آمدنی کے محدود حصّے کو صدقہ کرنا بعض اسکریننگ نظاموں (screening criteria) میں ’’تطہیر‘‘ کہلاتا ہے۔ ناقِد فقہی موقف کے مطابق، صدقہ کرنے سے اس آمدنی کے حُصول کا عمل اور اسکے مُوجِب عقد کا قصداً بالواسطہ حصّہ بننا جائز نہیں ہو جاتا۔ ناجائز آمدنی کو بغیر ثواب کی نیت سے صدقہ کرنا صرف ایسے مال سے خلُاصی کا طریقہ ہے جو پہلے کی کسی غلطی یا لاعلمی سے حاصل ہو چکا ہو۔چند فیصد سودی آمدنی والی کمپنیوں کو اسلامی لسٹ میں رکھنے والےاِس انڈیکس میں سب کچھ جانتے ہوئے پیسے لگائے رکھنا درحقیقت توبہ اور تطہیر کی نیّت سے بار بار ایک ہی غلطی کرنے کے مترادف ہے، جو کسی طرح بھی مناسب نہیں۔ ۶۔ مختلف اسکریننگ نظاموں (screening criteria) کے معیار بھی یکساں نہیں۔ دنیا بھر میں مختلف اسلامی اسٹاک انڈیکس سودی قرض، اثاثوں اور دیگر مالی تناسب کے لیے مختلف حدود اور طریقۂ کار استعمال کرتے ہیں۔ اسی وجہ سے ایک ہی کمپنی ایک جانچ کے نظام میں معیار پر پوری اتر سکتی ہے اور دوسرے میں نہیں۔ ۷۔ضمنی نکتہ: مُرَوَّجہ شرعی اسکریننگ کا تاریخی پس منظر: فیصدی بنیاد پر شرعی اسکریننگ ابتدا ہی سے تمام مُستند شرعی اداروں کا متفق علیہ موقف نہیں رہی۔ 1992ء میں مجمع الفقہ الاسلامی (OIC) کی قرارداد نمبر 63 میں سودی معاملات میں ملوث کمپنی کے بارے میں نسبتاً سخت موقف اختیار کیا گیا۔ بعد میں AAOIFI نے بعض مالیاتی تناسب کے لیے مخصوص فیصدی حدود مقرر کیں، جنہیں بعد میں کئی اسلامی اسٹاک انڈیکس (stock indices)، نے بھی اپنایا۔ اس لیے موجودہ فیصدی حدود کو ایک’’اتفاقی و اجتماعی‘‘ شرعی اصول کے بجائے ، بعد کے فقہی اجتہاد کے طور پر دیکھنا زیادہ مناسب ہے۔ یہاں AAOIFI کے حوالے سے conflict of interest کا ایک اہم علمی سوال بھی پیدا ہوتا ہے۔ AAOIFI کا ادارہ جاتی ڈھانچہ اسلامی مالیاتی صنعت کے ساتھ ’’ گہرا تعلق‘‘ رکھتا ہے؛ اس کے بورڈ میں اسلامی مالیاتی اداروں کے نمائندے شامل رہے ہیں، جبکہ اس کے بعض شرعی اسکالر خود اسلامی مالیاتی اداروں کے شرعی بورڈز سے وابستہ رہے ہیں۔ اس صورتِ حال میں یہ سوال بجا طور پر اٹھایا جا سکتا ہے کہ کیا ایسے ادارہ جاتی مفادات نے، براہِ راست یا بالواسطہ، نسبتاً نرم (screening criteria)، کی تشکیل کو متاثر کیا؟ یہ دعویٰ نہیں کہ ایسا اثر لازماً ہوا، بلکہ ایک حقیقی (conflict-of-interest concern)، ہے جسے معیار سازی کے تاریخی ریکارڈ کی روشنی میں جانچنا چاہیے۔ خلاصہ ءِکلام: کسی کمپنی یا انڈیکس کا اِسکریننگ نظاموں (screening criteria) کے مقررہ معیار پر پورا اترنا صرف یہ ظاہر کرتا ہے کہ وہ متعیّن کاروباری اور مالی حدود کے اندر ہے، لیکن مُستند اور غیر جانب دار علماء و فقہاء کے نزدیک اسے کمپنی کے تمام معاملات کے ’’شرعاً درست‘‘ اور سود سے پاک ہونے کی دلیل نہیں سمجھا جا سکتا۔ لہٰذا، اِس كو جائز اور ’’شریعت کے مطابق‘‘ کے لیبل(label) سے مشتہر کرنا درست نہیں ۔ (مصادر و مراجع ) References: Index Providers / Standard-Setting Bodies 1. Accounting and Auditing Organization for Islamic Financial Institutions (AAOIFI). Sharīʿah Standard No. 21: Financial Papers (Shares and Bonds). Manama, Bahrain: AAOIFI. https://aaoifi.com/shariaa-standards/?lang=en 2. FTSE Russell. FTSE Yasaar Global Equity Shariah Index Series: Ground Rules, v4.6. London: FTSE Russell. https://www.lseg.com/content/dam/ftse-russell/en_us/documents/ground-rules/ftse-yasaar-global-equity-shariah-index-series-ground-rules.pdf 3. S&P Dow Jones Indices. S&P Shariah Indices Methodology. New York: S&P Dow Jones Indices. https://www.spglobal.com/spdji/en/documents/methodologies/methodology-sp-shariah-indices.pdf 4. MSCI Inc. MSCI Islamic Index Series Methodology. New York: MSCI Inc. https://www.msci.com/documents/10199/8a59e89f-5134-de21-6a03-082ecfaa9e42 Fiqh Academy Resolutions 5. International Islamic Fiqh Academy (OIC). Resolution No. 63 (1/7): Financial Markets (Shares, Options, Commodities, and Credit Cards). Seventh Session, Jeddah, Saudi Arabia, 7–12 Dhū al-Qiʿdah 1412H (9–14 May 1992). https://iifa-aifi.org/en/32438.html Academic Journal Articles 6. Akartepe, B. B. (2022). Hisse Senedi Şerʿî İzleme Faaliyetlerinde Kullanılan Eşik Değerlere Dair Eleştirel Bir İnceleme [A Critical Examination of the Threshold Values Used in Sharīʿah Stock Screening]. International Journal of Islamic Economics and Finance Studies, 8(2), 123–151. https://dergipark.org.tr/en/pub/ijisef/issue/71516/1129328 7. Habib, F., & Ahmad, A. U. F. (2017). Revisiting the AAOIFI Sharīʿah Standards' Stock Screening Criteria. International Journal of Business and Society, 18(S1), 151–166. https://www.ijbs.unimas.my/images/repository/pdf/Vol18-S1-paper9.pdf فتاویٰ و مجلس شرعی کے فیصلے: ۸۔ وقار الفتاویٰ، حضرت علامہ مفتی محمد وقار الدین قادری رضوی (مفتی اعظم پاکستان)، ۱/۲۳۴، مطبوعۃ: بزم وقار الدین، کراچی ۹۔ مجلس شرعی کے فیصلے، مرتب: مفتی محمد نظام الدین رضوی برکاتی (ناظمِ مجلس شرعی و صدرِ شعبۂ افتاء جامعہ اشرفیہ، مبارک پور)، ۱/۱۴۴، مطبوعۃ: مجلس شرعی الجامعۃ الاشرفیہ، مبارک پور، ۱۴۳۵ھ-۲۰۱۴م ۱۰فقہ اسلامی کے سات بنیادی اصول، مفتی محمد نظام الدین رضوی برکاتی ، ص ۵۸، دار النعمان، طبع ثالث، ۱۴۳۵ھ، ۲۰۱۴ء، کراچی۔"
  }
};
