// 獨立複製自原地圖，保留地標名稱、座標與範圍。
const YEYAN_MAP_MARKERS = [
  {
    "id": "marker-1772707641853",
    "lat": 2746.53,
    "lng": 2424.89,
    "name": "貓咖",
    "color": "#3b82f6",
    "radius": 50
  },
  {
    "id": "marker-1776437302725",
    "lat": 2593.67,
    "lng": 2621.95,
    "name": "修車廠",
    "color": "#3b82f6",
    "radius": 100
  },
  {
    "id": "marker-1776436669154",
    "lat": 2948.99,
    "lng": 2848.01,
    "name": "威能橋",
    "color": "#3b82f6",
    "radius": 50
  },
  {
    "id": "marker-1772707774794",
    "lat": 3072.17,
    "lng": 3033,
    "name": "圓帽山醫院",
    "color": "#3b82f6",
    "radius": 30
  },
  {
    "id": "marker-1772707810452",
    "lat": 3622,
    "lng": 3472,
    "name": "圓帽山高速公路",
    "color": "#3b82f6",
    "radius": 200
  },
  {
    "id": "marker-1772707838798",
    "lat": 3320,
    "lng": 1130,
    "name": "西濱高速公路",
    "color": "#3b82f6",
    "radius": 200
  },
  {
    "id": "marker-1772707910105",
    "lat": 3023.96,
    "lng": 1991.09,
    "name": "彩虹停車場",
    "color": "#3b82f6",
    "radius": 50
  },
  {
    "id": "marker-1772707946019",
    "lat": 3073.41,
    "lng": 1942.57,
    "name": "市政府",
    "color": "#3b82f6",
    "radius": 40
  },
  {
    "id": "marker-1772707967792",
    "lat": 2856.95,
    "lng": 2921.33,
    "name": "大公園",
    "color": "#3b82f6",
    "radius": 100
  },
  {
    "id": "marker-1772707995695",
    "lat": 1689.72,
    "lng": 3656.56,
    "name": "佩島大橋",
    "color": "#3b82f6",
    "radius": 100
  },
  {
    "id": "marker-1772708027536",
    "lat": 1651.47,
    "lng": 2089.99,
    "name": "機場",
    "color": "#3b82f6",
    "radius": 100
  },
  {
    "id": "marker-1772708050848",
    "lat": 2517.37,
    "lng": 1941.3,
    "name": "商店街",
    "color": "#3b82f6",
    "radius": 100
  },
  {
    "id": "marker-1772708077196",
    "lat": 2737.98,
    "lng": 2115.17,
    "name": "水區",
    "color": "#3b82f6",
    "radius": 100
  },
  {
    "id": "marker-1772708089108",
    "lat": 2305.18,
    "lng": 2901.6,
    "name": "街區",
    "color": "#3b82f6",
    "radius": 200
  },
  {
    "id": "marker-1772708112137",
    "lat": 3111.4,
    "lng": 3598.3,
    "name": "米羅公園",
    "color": "#3b82f6",
    "radius": 200
  },
  {
    "id": "marker-1772708132492",
    "lat": 3563.99,
    "lng": 3553.43,
    "name": "賭場",
    "color": "#3b82f6",
    "radius": 100
  },
  {
    "id": "marker-1772708148016",
    "lat": 3867.48,
    "lng": 2422.62,
    "name": "富人區/豪宅區",
    "color": "#3b82f6",
    "radius": 300
  },
  {
    "id": "marker-1772708173450",
    "lat": 3686.98,
    "lng": 2294.79,
    "name": "日蝕大樓/北公寓",
    "color": "#3b82f6",
    "radius": 100
  },
  {
    "id": "marker-1772708216548",
    "lat": 3620,
    "lng": 2989,
    "name": "太平洋銀行",
    "color": "#3b82f6",
    "radius": 100
  },
  {
    "id": "marker-1772708288921",
    "lat": 2946.13,
    "lng": 2512.77,
    "name": "白停車場",
    "color": "#3b82f6",
    "radius": 50
  },
  {
    "id": "marker-1772708308633",
    "lat": 2933.82,
    "lng": 2602.64,
    "name": "紅白停車場",
    "color": "#3b82f6",
    "radius": 50
  },
  {
    "id": "marker-1772708331078",
    "lat": 3303.78,
    "lng": 2397.65,
    "name": "珠寶店",
    "color": "#3b82f6",
    "radius": 30
  },
  {
    "id": "marker-1772708377876",
    "lat": 3174.25,
    "lng": 2435.5,
    "name": "樹洞",
    "color": "#3b82f6",
    "radius": 5
  },
  {
    "id": "marker-1772708422933",
    "lat": 3166.25,
    "lng": 2887.82,
    "name": "工地缺口",
    "color": "#3b82f6",
    "radius": 5
  },
  {
    "id": "marker-1772708467323",
    "lat": 3195.51,
    "lng": 2874.56,
    "name": "旋轉工地",
    "color": "#3b82f6",
    "radius": 50
  },
  {
    "id": "marker-1772708505210",
    "lat": 2739.65,
    "lng": 2712.08,
    "name": "車商旁工地",
    "color": "#3b82f6",
    "radius": 50
  },
  {
    "id": "marker-1772708617037",
    "lat": 2995.61,
    "lng": 1948.48,
    "name": "麻花卷",
    "color": "#3b82f6",
    "radius": 100
  },
  {
    "id": "marker-1772708645886",
    "lat": 3816.49,
    "lng": 3280.23,
    "name": "小舞台",
    "color": "#3b82f6",
    "radius": 100
  },
  {
    "id": "marker-1772708753301",
    "lat": 2105.6,
    "lng": 2767.83,
    "name": "車聚廣場",
    "color": "#3b82f6",
    "radius": 100
  },
  {
    "id": "marker-1772708771727",
    "lat": 2141.47,
    "lng": 2610.64,
    "name": "體育館",
    "color": "#3b82f6",
    "radius": 100
  },
  {
    "id": "marker-1772708793249",
    "lat": 3682.97,
    "lng": 1284.46,
    "name": "博物館",
    "color": "#3b82f6",
    "radius": 100
  },
  {
    "id": "marker-1772708812770",
    "lat": 5585.45,
    "lng": 3764.26,
    "name": "中部機場",
    "color": "#3b82f6",
    "radius": 200
  },
  {
    "id": "marker-1772708833637",
    "lat": 5581.97,
    "lng": 1365.02,
    "name": "軍事基地",
    "color": "#3b82f6",
    "radius": 500
  },
  {
    "id": "marker-1772708856487",
    "lat": 7814.06,
    "lng": 2747.46,
    "name": "北部小鎮",
    "color": "#3b82f6",
    "radius": 200
  },
  {
    "id": "marker-1772708876259",
    "lat": 5992.87,
    "lng": 4011.5,
    "name": "中部小鎮",
    "color": "#3b82f6",
    "radius": 200
  },
  {
    "id": "marker-1772708890882",
    "lat": 4239.94,
    "lng": 3800.51,
    "name": "大莊園",
    "color": "#3b82f6",
    "radius": 100
  },
  {
    "id": "marker-1772708910768",
    "lat": 3446.08,
    "lng": 3969.21,
    "name": "水壩",
    "color": "#3b82f6",
    "radius": 100
  },
  {
    "id": "marker-1772708936473",
    "lat": 6997,
    "lng": 5097,
    "name": "燈塔",
    "color": "#3b82f6",
    "radius": 10
  },
  {
    "id": "marker-1772709853885",
    "lat": 2823.36,
    "lng": 2642.35,
    "name": "南公寓",
    "color": "#3b82f6",
    "radius": 100
  },
  {
    "id": "marker-1772709880051",
    "lat": 2857.88,
    "lng": 2656.81,
    "name": "就業中心",
    "color": "#3b82f6",
    "radius": 100
  },
  {
    "id": "marker-1772708959215",
    "lat": 6747.89,
    "lng": 4265.66,
    "name": "中部小機庫",
    "color": "#3b82f6",
    "radius": 100
  },
  {
    "id": "marker-1772708981447",
    "lat": 6198.38,
    "lng": 3586.24,
    "name": "中部湖",
    "color": "#3b82f6",
    "radius": 500
  },
  {
    "id": "marker-1772709002824",
    "lat": 2786.71,
    "lng": 3874.95,
    "name": "東部高速公路",
    "color": "#3b82f6",
    "radius": 100
  },
  {
    "id": "marker-1772709026124",
    "lat": 2795.9,
    "lng": 3129.65,
    "name": "舊警局",
    "color": "#3b82f6",
    "radius": 30
  },
  {
    "id": "marker-1772709686357",
    "lat": 7284.61,
    "lng": 3138.85,
    "name": "山頂觀景台",
    "color": "#3b82f6",
    "radius": 30
  },
  {
    "id": "marker-1772709729115",
    "lat": 7297,
    "lng": 2319,
    "name": "北部纜車站",
    "color": "#3b82f6",
    "radius": 30
  }
];
