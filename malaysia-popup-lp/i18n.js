/* EN / 中文 switch. English is written in the HTML; Chinese strings live here (keyed by data-i18n). */
(function () {
  'use strict';

  var ZH = {
    'nav.event': '活动',
    'nav.about': 'FiveFingers',
    'nav.why': '为什么赤足',
    'nav.steps': '现场流程',
    'nav.faq': '常见问题',
    'nav.details': '活动详情',
    'nav.directions': '获取路线',

    'hero.eyebrow': 'Vibram FiveFingers 快闪活动 <span class="eb-venue">@ Ativo Plaza</span>',
    'hero.title': 'Barefoot Malaysia<br><span class="accent">吉隆坡</span> <span class="inkl">快闪店</span>',
    'hero.offer': '最高 30% OFF',
    'hero.date': '2026年11月13日（五）– 15日（日）',
    'hero.time': '周五、周六 上午10点 – 下午6点<br>周日 上午10点 – 下午5点',
    'hero.venue': '<strong>Ativo Plaza</strong><span>吉隆坡 Bandar Sri Damansara</span>',
    'hero.directions': '获取路线',
    'cd.days': '天', 'cd.hrs': '时', 'cd.min': '分', 'cd.sec': '秒',

    'ov.kicker': '吉隆坡 VFF 快闪店',
    'ov.title': '<span class="ln">三天活动。</span> <span class="ln">多款鞋型。</span><br>最高 30% 折扣。',
    'ov.lead': 'Barefoot Malaysia 将 Vibram FiveFingers 全系列带到 Ativo Plaza。欢迎前来感受五趾自由的不同，由我们的团队为您试穿配码，一起开启赤足鞋的新风格。',
    'ov.c1': '<span class="check"></span>试穿并找到适合你的鞋型与尺码',
    'ov.c2': '<span class="check"></span>团队免费提供试穿建议',
    'ov.c3': '<span class="check"></span>男款与女款尺码齐全',
    'ov.c4': '<span class="check"></span>活动限定价格，10% 至 30% 折扣',

    'about.kicker': '关于品牌',
    'about.title': '什么是 Vibram FiveFingers？',
    'about.lead': 'Vibram FiveFingers 是一款极简鞋，拥有五个独立的脚趾袋、轻薄柔韧的 Vibram 橡胶鞋底，让双脚与地面之间几乎没有阻隔。它的设计初衷，就是让双脚以最自然的方式运动。',
    'about.p1t': '源自意大利 Vibram',
    'about.p1': 'Vibram 自 1937 年起为登山者和运动员制造橡胶外底。FiveFingers 于 2004 年诞生，开启了赤足鞋潮流。',
    'about.p2t': '五趾分离，一体如足',
    'about.p2': '每个脚趾都有独立的趾袋，让脚趾可以像赤足一样自由张开、抓地与平衡。',
    'about.p3t': '每种活动都有适合的鞋型',
    'about.p3': '公路跑、越野跑、水上运动、瑜伽、训练与日常穿着。<br> 各种用途，都能享受赤足鞋的乐趣。',

    'lu.kicker': '活动鞋款',
    'lu.title': '适合每一种运动的 FiveFingers',
    'lu.lead': '从公路到山径、水边、瑜伽室与健身房。以下所有鞋型都会在快闪店现场，<strong>10% 至 30% 折扣</strong>，男款女款尺码齐全。',
    'lu.1t': '公路跑步', 'lu.1': '轻盈透气、速度感十足，适合日常跑步。',
    'lu.2t': '越野跑步', 'lu.2': '面对泥地、树根与岩石，抓地与保护兼备。',
    'lu.6t': '徒步 / 攀爬', 'lu.6': '强韧抓地与保护，适合徒步与岩石攀爬。',
    'lu.3t': '户外 / 水上运动', 'lu.3': '快干设计，适合海滩、溪流与炎热天气。',
    'lu.4t': '瑜伽 &amp; 普拉提', 'lu.4': '轻巧柔软、抓地力佳，专为室内课程打造。',
    'lu.5t': '训练', 'lu.5': '平坦稳定，适合举重与功能性训练。',
    'lu.more': '现场还有更多颜色与鞋型！',
    'lu.note': '颜色与尺码视现场库存而定。活动折扣于现场结算时适用，各鞋型折扣不同。',

    'why.title': '为什么选择<em>赤足？</em>',
    'why.sub': '你是否也有这些困扰？',
    'why.i1t': '拇趾外翻与脚趾变形', 'why.i1': '窄鞋把脚趾挤在一起，使大脚趾偏离正常位置。',
    'why.i2t': '足跟痛与扁平足', 'why.i2': '缓震鞋跟和足弓支撑让足部肌肉停止工作、逐渐退化。',
    'why.i3t': '膝痛与脚踝无力', 'why.i3': '脚跟着地把冲击直接传到关节，并削弱平衡反射。',
    'why.i4t': '腰背疼痛', 'why.i4': '抬高的鞋跟让身体前倾，加重下背与肩部的负担。',

    'band.kicker': '— 解决方案就在这里 —',
    'band.title': '<em>赤足</em>的好处',
    'band.sub': '用赤足运动改善现代身体的酸痛',
    'band.1t': '强化脚底与整个足部',
    'band.1': '建立核心<em>足部力量</em>，自然调整<em>身体姿态</em>。',
    'band.2t': '与健康问题的关系',
    'band.2': '促进<em>血液循环</em>，缓解扁平足、拇趾外翻等带来的紧绷与慢性疼痛。',
    'band.3t': '与运动伤害的关系',
    'band.3': '激活<em>感官反馈</em>，反应更快、落地更稳。通过优化冲击力学，让肌肉更好地吸收落地冲击，达到<em>预防伤害</em>的效果。',

    'vs.title': '普通鞋 <span class="vs-word">vs</span> <em>赤足理论</em>',
    'vs.nh': '普通鞋', 'vs.bh': '赤足理论',
    'vs.n1t': '姿态：鞋跟抬高', 'vs.n1': '重心前移，造成腰背与肩部紧张。',
    'vs.n2t': '脚趾空间：脚趾受挤压', 'vs.n2': '窄小的鞋头把脚趾挤在一起。',
    'vs.n3t': '感知：厚鞋底', 'vs.n3': '阻隔地面反馈，减慢平衡反射。',
    'vs.n4t': '冲击：脚跟着地', 'vs.n4': '强烈冲击直接传入关节。',
    'vs.n5t': '恢复：像“夹板”', 'vs.n5': '限制活动，使足部肌肉退化。',
    'vs.b1t': '姿态：赤足', 'vs.b1': '自然对齐脊椎、髋部与肩膀。',
    'vs.b2t': '脚趾空间：自然张开', 'vs.b2': '脚趾可自由张开、独立活动。',
    'vs.b3t': '感知：直接接触', 'vs.b3': '唤醒神经，即时保持平衡与稳定。',
    'vs.b4t': '天然缓冲', 'vs.b4': '身体本身就是减震器，落地更柔和。',
    'vs.b5t': '唤醒肌肉', 'vs.b5': '强化深层肌肉，从根本解决问题。',

    'st.kicker': '现场流程',
    'st.title': '到店流程，一步一步来',
    'st.lead': '无需预约、没有压力。营业时间内（周五、周六 上午10点至下午6点，周日 上午10点至下午5点）随时光临，我们会全程为您服务。',
    'st.1t': '在 Ativo Plaza 找到我们',
    'st.1': '前往 Bandar Sri Damansara 的 Ativo Plaza，找到活动地点。可使用下方地图链接导航。',
    'st.2t': '告诉我们你的运动方式',
    'st.2': '跑步、越野、水上、瑜伽还是健身房？我们的团队会根据你的用途推荐合适的鞋型。',
    'st.3t': '试穿并活动一下',
    'st.3': '把脚趾滑入趾袋，走一走、跳一跳、蹲一蹲。多试几款鞋型与尺码，直到找到最合脚的一双。',
    'st.4t': '以折扣价选购你的鞋',
    'st.4': '选好鞋型与颜色，在现场以活动折扣价结账。库存有限，<br class="mbr">越早到选择越多。',
    'st.5t': '开启你的赤足之旅',
    'st.5': '带走新鞋、保养说明，<br class="mbr">以及最初几周循序渐进适应赤足运动的简单计划。',
    'st.cta': '获取前往 Ativo Plaza 的路线',

    'faq.kicker': 'FAQ',
    'faq.title': '常见问题',
    'faq.q1': '所有鞋型都有 30% 折扣吗？',
    'faq.a1': '<p>本次活动 Vibram FiveFingers 全系列享有 <strong>10% 至 30% 折扣</strong>。具体折扣视鞋型与配色而定，仅限活动三天在现场适用，售完即止。</p>',
    'faq.q2': '购买前可以试穿吗？',
    'faq.a2': '<p>当然，这正是快闪店的意义。所有鞋型都提供男款与女款尺码试穿。FiveFingers 因为每个脚趾都有独立趾袋，穿着感与普通鞋不同，建议多试几款鞋型与尺码，我们的团队会帮你找到最合适的一双。</p>',
    'faq.q3': '我从没穿过赤足鞋，该怎么开始？',
    'faq.a3': '<p>循序渐进。先从 20 到 30 分钟的短距离步行开始，随着双脚与小腿逐渐适应，在几周内慢慢增加时间。等步行感觉舒适后，再过渡到跑步或更长时间的运动。倾听身体的感受，有酸痛就休息。</p>',
    'faq.q4': '需要专用的袜子吗？',
    'faq.a4': '<p>不需要。FiveFingers 设计为可直接赤脚穿着。如果你习惯穿袜子，五趾袜适用于所有鞋型。</p>',
    'faq.q5': '可以换货或退货吗？',
    'faq.a5': '<p>快闪店现场购买的商品不接受退换，请在购买前仔细试穿并确认尺码。我们的工作人员会协助你找到合适的尺码。</p>',
    'faq.q6': '可以用什么方式付款？',
    'faq.a6': '<p>现场接受现金、二维码支付与信用卡。</p>',

    'dt.kicker': '规划你的行程',
    'dt.title': '活动详情',
    'dt.k1': '活动', 'dt.v1': 'Barefoot Malaysia 快闪店（Vibram FiveFingers）',
    'dt.k2': '日期', 'dt.v2': '2026年11月13日（五）– 15日（日）',
    'dt.k3': '时间', 'dt.v3': '周五、周六：上午10:00 – 下午6:00<br>周日：上午10:00 – 下午5:00',
    'dt.k4': '地点', 'dt.v4': 'Ativo Plaza, B-3A-02, Block B<br>Damansara Avenue, Bandar Sri Damansara, Kuala Lumpur',
    'dt.k5': '入场', 'dt.v5': '免费入场，无需预约',
    'dt.maps': '在 Google 地图中打开',
    'dt.video': '<span class="play-ico"></span>如何前往展位',
    'video.caption': '从停车场到我们位于 Block B, B-3A-02 展位的简短路线指引。',

    'cta.kicker': '11月13日（五）– 15日（日）<span class="msep"> · </span><br class="mbr">周五、周六 上午10点 – 下午6点 · 周日 上午10点 – 下午5点',
    'cta.title': 'Ativo Plaza 见。',
    'cta.maps': '在 Google 地图中打开',
    'footer.text': 'Barefoot Malaysia Sdn. Bhd.'
  };

  var ATTR = {
    'nav.menu': { 'aria-label': '打开菜单' }
  };

  var nodes = document.querySelectorAll('[data-i18n]');
  var EN = {};
  nodes.forEach(function (el) { EN[el.getAttribute('data-i18n')] = el.innerHTML; });

  var btn = document.getElementById('langBtn');

  function apply(lang) {
    var dict = lang === 'zh' ? ZH : EN;
    nodes.forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (dict[k] != null) el.innerHTML = dict[k];
    });
    document.documentElement.setAttribute('lang', lang === 'zh' ? 'zh-CN' : 'en');
    document.documentElement.setAttribute('data-lang', lang);
    document.title = lang === 'zh'
      ? 'Barefoot Malaysia 吉隆坡快闪店 @ Ativo Plaza | Vibram FiveFingers'
      : 'Barefoot Malaysia Pop-Up Store at Ativo Plaza | Vibram FiveFingers';
    if (btn) {
      btn.textContent = lang === 'zh' ? 'EN' : '中文';
      btn.setAttribute('aria-label', lang === 'zh' ? 'Switch to English' : '切换到中文');
    }
    try { localStorage.setItem('bfm-lang', lang); } catch (e) {}
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
  }

  var initial = 'en';
  try {
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'zh' || q === 'en') initial = q;
    else initial = localStorage.getItem('bfm-lang') || 'en';
  } catch (e) {}
  if (initial === 'zh') apply('zh');

  if (btn) {
    btn.addEventListener('click', function () {
      apply(document.documentElement.getAttribute('data-lang') === 'zh' ? 'en' : 'zh');
    });
  }

  window.BFM_LANG = function () { return document.documentElement.getAttribute('data-lang') || 'en'; };
})();
