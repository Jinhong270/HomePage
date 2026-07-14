const API = {
  quotes: [
    { text: "星垂平野阔，月涌大江流。", from: "杜甫 · 旅夜书怀" },
    { text: "人生若只如初见，何事秋风悲画扇。", from: "纳兰性德" },
    { text: "落霞与孤鹜齐飞，秋水共长天一色。", from: "王勃 · 滕王阁序" },
    { text: "会当凌绝顶，一览众山小。", from: "杜甫 · 望岳" },
    { text: "海内存知己，天涯若比邻。", from: "王勃" },
    { text: "山重水复疑无路，柳暗花明又一村。", from: "陆游" },
    { text: "采菊东篱下，悠然见南山。", from: "陶渊明" },
    { text: "长风破浪会有时，直挂云帆济沧海。", from: "李白" },
    { text: "沉舟侧畔千帆过，病树前头万木春。", from: "刘禹锡" },
    { text: "不畏浮云遮望眼，自缘身在最高层。", from: "王安石" },
    { text: "纸上得来终觉浅，绝知此事要躬行。", from: "陆游" },
    { text: "问渠那得清如许？为有源头活水来。", from: "朱熹" },
    { text: "穷则独善其身，达则兼济天下。", from: "孟子" },
    { text: "天行健，君子以自强不息。", from: "周易" },
    { text: "路漫漫其修远兮，吾将上下而求索。", from: "屈原" },
    { text: "明月几时有？把酒问青天。", from: "苏轼" },
    { text: "但愿人长久，千里共婵娟。", from: "苏轼" },
    { text: "春风得意马蹄疾，一日看尽长安花。", from: "孟郊" },
    { text: "大鹏一日同风起，扶摇直上九万里。", from: "李白" },
    { text: "天生我材必有用，千金散尽还复来。", from: "李白" },
    { text: "安能摧眉折腰事权贵，使我不得开心颜。", from: "李白" },
    { text: "仰天大笑出门去，我辈岂是蓬蒿人。", from: "李白" },
    { text: "莫听穿林打叶声，何妨吟啸且徐行。", from: "苏轼" },
    { text: "竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。", from: "苏轼" },
    { text: "回首向来萧瑟处，归去，也无风雨也无晴。", from: "苏轼" },
    { text: "欲穷千里目，更上一层楼。", from: "王之涣" },
    { text: "野火烧不尽，春风吹又生。", from: "白居易" },
    { text: "少壮不努力，老大徒伤悲。", from: "汉乐府" },
    { text: "宝剑锋从磨砺出，梅花香自苦寒来。", from: "警世贤文" },
    { text: "书山有路勤为径，学海无涯苦作舟。", from: "韩愈" },
    { text: "业精于勤荒于嬉，行成于思毁于随。", from: "韩愈" },
    { text: "先完成，再完美。", from: "Jinhong270" },
    { text: "代码如诗，逻辑如画。", from: "Jinhong270" },
    { text: "简约而不简单。", from: "" },
    { text: "做难而正确的事。", from: "" },
    { text: "Stay hungry, stay foolish.", from: "Steve Jobs" },
    { text: "The only way to do great work is to love what you do.", from: "Steve Jobs" },
    { text: "Talk is cheap. Show me the code.", from: "Linus Torvalds" },
    { text: "Simplicity is the ultimate sophistication.", from: "Leonardo da Vinci" },
    { text: "Done is better than perfect.", from: "" },
    { text: "Move fast and break things.", from: "" },
    { text: "专注当下，方得始终。", from: "" },
    { text: "心有猛虎，细嗅蔷薇。", from: "萨松" },
    { text: "人生如逆旅，我亦是行人。", from: "苏轼" },
    { text: "此心安处是吾乡。", from: "苏轼" },
    { text: "人间有味是清欢。", from: "苏轼" },
    { text: "竹外桃花三两枝，春江水暖鸭先知。", from: "苏轼" },
    { text: "不积跬步，无以至千里。", from: "荀子" },
    { text: "千里之行，始于足下。", from: "老子" },
    { text: "知者不惑，仁者不忧，勇者不惧。", from: "论语" },
    { text: "博观而约取，厚积而薄发。", from: "苏轼" },
    { text: "行到水穷处，坐看云起时。", from: "王维" },
    { text: "空山新雨后，天气晚来秋。", from: "王维" },
    { text: "明月松间照，清泉石上流。", from: "王维" },
    { text: "我见青山多妩媚，料青山见我应如是。", from: "辛弃疾" },
    { text: "众里寻他千百度，蓦然回首，那人却在灯火阑珊处。", from: "辛弃疾" },
    { text: "了却君王天下事，赢得生前身后名。", from: "辛弃疾" },
    { text: "古今多少事，都付笑谈中。", from: "杨慎" },
    { text: "青山依旧在，几度夕阳红。", from: "杨慎" }
  ],

  getQuote() {
    const q = this.quotes[Math.floor(Math.random() * this.quotes.length)];
    return { text: q.text, from: q.from || "—" };
  },

  async fetchWithRetry(url, options = {}, retries = 1) {
    try {
      const res = await fetch(url, { ...options, mode: "cors", cache: "no-store", redirect: "follow" });
      if (!res.ok) throw new Error("status " + res.status);
      return res;
    } catch (e) {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 500));
        return this.fetchWithRetry(url, options, retries - 1);
      }
      throw e;
    }
  },

  async getLocation() {
    const urls = [
      "https://jinhong270-api.hf.space/ip/"
    ];
    for (const url of urls) {
      try {
        const res = await this.fetchWithRetry(url);
        const data = await res.json();
        if (data && (data.lat || data.city)) {
          return {
            city: data.city || data.regionName || "未知",
            region: data.regionName || data.region || "",
            country: data.country || data.countryCode || "",
            lat: Number(data.lat),
            lon: Number(data.lon)
          };
        }
      } catch (e) {}
    }
    return {
      city: "北京",
      region: "北京",
      country: "中国",
      lat: 39.9042,
      lon: 116.4074
    };
  },

  async getWeather(lat, lon) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,apparent_temperature&daily=sunrise,sunset&timezone=auto&forecast_days=1`;
      const res = await this.fetchWithRetry(url);
      const data = await res.json();
      const current = data.current;
      const daily = data.daily || {};
      return {
        temp: Math.round(current.temperature_2m),
        feels: Math.round(current.apparent_temperature || current.temperature_2m),
        code: current.weather_code,
        humidity: current.relative_humidity_2m,
        wind: Math.round(current.wind_speed_10m),
        sunrise: daily.sunrise ? daily.sunrise[0] : null,
        sunset: daily.sunset ? daily.sunset[0] : null
      };
    } catch {
      return null;
    }
  },

  formatTime(iso) {
    if (!iso) return "--:--";
    try {
      const d = new Date(iso);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch {
      return "--:--";
    }
  },

  weatherCodeToText(code) {
    const map = {
      0: "晴朗", 1: "主要晴朗", 2: "局部多云", 3: "阴天",
      45: "有雾", 48: "雾凇",
      51: "小毛毛雨", 53: "毛毛雨", 55: "大毛毛雨",
      61: "小雨", 63: "中雨", 65: "大雨",
      71: "小雪", 73: "中雪", 75: "大雪",
      80: "小阵雨", 81: "阵雨", 82: "强阵雨",
      95: "雷暴", 96: "雷暴伴冰雹", 99: "强雷暴伴冰雹"
    };
    return map[code] || "未知";
  },

  getTimeTheme() {
    const h = new Date().getHours();
    if (h >= 5 && h < 8) return "dawn";
    if (h >= 8 && h < 17) return "day";
    if (h >= 17 && h < 20) return "dusk";
    return "night";
  },

  getGradient(theme) {
    const map = {
      dawn: [
        "linear-gradient(160deg, #1a1035 0%, #4a1942 35%, #c45c26 70%, #f4a261 100%)",
        "linear-gradient(145deg, #0f0c29 0%, #302b63 40%, #e07a5f 100%)"
      ],
      day: [
        "linear-gradient(160deg, #0c4a6e 0%, #0369a1 40%, #7dd3fc 100%)",
        "linear-gradient(145deg, #134e4a 0%, #0f766e 45%, #5eead4 100%)"
      ],
      dusk: [
        "linear-gradient(160deg, #1e1b4b 0%, #7c3aed 35%, #f97316 70%, #fbbf24 100%)",
        "linear-gradient(145deg, #2e1065 0%, #9d174d 50%, #fb923c 100%)"
      ],
      night: [
        "linear-gradient(160deg, #020617 0%, #0f172a 40%, #1e293b 100%)",
        "linear-gradient(145deg, #0a0a0f 0%, #1e1b4b 50%, #0f172a 100%)",
        "linear-gradient(160deg, #020617 0%, #164e63 50%, #0f172a 100%)"
      ]
    };
    const list = map[theme] || map.night;
    return list[Math.floor(Math.random() * list.length)];
  }
};
