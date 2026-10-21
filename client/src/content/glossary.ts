import type { Bi } from '../i18n';

export type GlossaryCategory =
  | 'basics'
  | 'charts'
  | 'orders'
  | 'money'
  | 'risk'
  | 'indicators'
  | 'strategies'
  | 'results'
  | 'app';

export interface GlossaryTerm {
  id: string;
  category: GlossaryCategory;
  term: Bi;
  /** One line, shown in tooltips. */
  short: Bi;
  detail: Bi;
  example: Bi;
  why: Bi;
  related: string[];
}

const b = (en: string, hinglish: string): Bi => ({ en, hinglish });

export const CATEGORIES: { id: GlossaryCategory; label: Bi; icon: string }[] = [
  { id: 'basics', label: b('The basics', 'Basic baatein'), icon: '🌱' },
  { id: 'charts', label: b('Prices & charts', 'Price aur charts'), icon: '📈' },
  { id: 'orders', label: b('Orders & costs', 'Orders aur kharche'), icon: '🧾' },
  { id: 'money', label: b('Your money', 'Aapka paisa'), icon: '👛' },
  { id: 'risk', label: b('Staying safe (risk)', 'Safe rehna (risk)'), icon: '🛡️' },
  { id: 'indicators', label: b('Indicators', 'Indicators'), icon: '🧭' },
  { id: 'strategies', label: b('Strategies', 'Strategies'), icon: '♟️' },
  { id: 'results', label: b('Judging results', 'Result kaise samjhein'), icon: '🏁' },
  { id: 'app', label: b('This app', 'Yeh app'), icon: '🤖' },
];

export const GLOSSARY: GlossaryTerm[] = [
  // ---------------- Basics ----------------
  {
    id: 'paper-trading',
    category: 'basics',
    term: b('Paper trading', 'Paper trading'),
    short: b(
      'Practice trading with fake money but real prices.',
      'Nakli paise se trading ki practice, lekin price asli.',
    ),
    detail: b(
      'Paper trading means you pretend to buy and sell using money that does not exist. The prices come from the real market, so it feels real, but nothing you do here can win or lose real money. It is the safest way to learn.',
      'Paper trading ka matlab hai aise paise se buy aur sell karna jo asli nahi hain. Price asli market se aate hain, isliye sab real lagta hai, lekin yahan aapka koi asli paisa na banega na doobega. Seekhne ka sabse safe tareeka yahi hai.',
    ),
    example: b(
      'The app gives each strategy $10,000 of fake money. If it "buys" 1 BTC and the price drops, the fake balance goes down. Your bank account never changes.',
      'App har strategy ko $10,000 nakli paise deta hai. Agar woh 1 BTC "kharidti" hai aur price girta hai, toh nakli balance kam hota hai. Aapka bank account kabhi nahi badalta.',
    ),
    why: b(
      'You can make every beginner mistake here for free, before risking anything real.',
      'Saari beginner wali galtiyan yahan free mein ho jaati hain, asli paisa lagane se pehle.',
    ),
    related: ['backtest', 'wallet', 'bot'],
  },
  {
    id: 'market',
    category: 'basics',
    term: b('Market', 'Market'),
    short: b(
      'A place where people buy and sell something.',
      'Jagah jahan log cheezein kharidte-bechte hain.',
    ),
    detail: b(
      'A market is where buyers and sellers meet. This app follows four: Crypto (Bitcoin and friends, open all day every day), US stocks (companies like Apple), India NSE (companies like Reliance), and Global (gold, oil, currencies).',
      'Market woh jagah hai jahan buyer aur seller milte hain. Yeh app chaar markets dekhta hai: Crypto (Bitcoin wagairah, 24x7 khula), US stocks (Apple jaisi companies), India NSE (Reliance jaisi companies), aur Global (gold, oil, currencies).',
    ),
    example: b(
      'When you buy Apple shares, you are trading in the US stock market.',
      'Jab aap Apple ke shares lete ho, aap US stock market mein trade kar rahe ho.',
    ),
    why: b(
      'Each market has different opening hours, costs and behaviour, so a strategy that works in one may fail in another.',
      'Har market ke timings, kharche aur behaviour alag hote hain, isliye ek market mein chalne wali strategy doosre mein fail ho sakti hai.',
    ),
    related: ['market-hours', 'symbol', 'stock', 'crypto'],
  },
  {
    id: 'symbol',
    category: 'basics',
    term: b('Symbol (ticker)', 'Symbol (ticker)'),
    short: b(
      'The short code name of something you can trade.',
      'Trade hone wali cheez ka chhota code naam.',
    ),
    detail: b(
      'Every stock or coin has a short code so everyone knows exactly what is being traded. Crypto pairs show two coins: BTC/USDT means "Bitcoin priced in USDT (a dollar coin)".',
      'Har stock ya coin ka ek chhota code hota hai taaki sabko pata ho ki kya trade ho raha hai. Crypto pair mein do naam hote hain: BTC/USDT matlab "Bitcoin ki keemat USDT (dollar coin) mein".',
    ),
    example: b(
      'AAPL = Apple, RELIANCE = Reliance Industries, GC=F = gold futures, EURUSD=X = euro vs US dollar.',
      'AAPL = Apple, RELIANCE = Reliance Industries, GC=F = gold futures, EURUSD=X = euro vs US dollar.',
    ),
    why: b(
      'You pick symbols on the charts page and in tests.',
      'Charts page aur tests mein aap symbol hi chunte ho.',
    ),
    related: ['market', 'stock', 'crypto'],
  },
  {
    id: 'stock',
    category: 'basics',
    term: b('Stock (share)', 'Stock (share)'),
    short: b('A small piece of ownership in a company.', 'Kisi company mein chhota sa hissa.'),
    detail: b(
      'When a company is split into millions of tiny pieces, each piece is a share. If the company does well, people want its shares more and the price usually rises. If it does badly, the price usually falls.',
      'Company ko laakhon chhote hisson mein baanta jaata hai, har hissa ek share hai. Company achha kare toh log uske shares zyada chahte hain aur price aksar badhta hai. Bura kare toh price aksar girta hai.',
    ),
    example: b(
      'If you own 10 shares of TCS at ₹4,000 each, your holding is worth ₹40,000.',
      'Agar aapke paas TCS ke 10 shares ₹4,000 wale hain, toh aapka holding ₹40,000 ka hai.',
    ),
    why: b(
      'US and India markets in this app trade stocks.',
      'Is app mein US aur India markets stocks trade karte hain.',
    ),
    related: ['market', 'symbol', 'market-hours'],
  },
  {
    id: 'crypto',
    category: 'basics',
    term: b('Crypto', 'Crypto'),
    short: b(
      'Digital coins like Bitcoin, traded online 24/7.',
      'Bitcoin jaise digital coins, 24x7 online trade hote hain.',
    ),
    detail: b(
      'Cryptocurrencies are digital money that live on the internet. Their prices can move a lot, very fast, and the market never closes, not even on weekends.',
      'Cryptocurrency internet pe chalne wala digital paisa hai. Inke price bahut tezi se aur bahut zyada hil sakte hain, aur market kabhi band nahi hota, weekend pe bhi nahi.',
    ),
    example: b(
      'Bitcoin can move 3% in an hour. A stock like Apple usually moves less than that in a whole day.',
      'Bitcoin ek ghante mein 3% hil sakta hai. Apple jaisa stock aksar poore din mein bhi itna nahi hilta.',
    ),
    why: b(
      'Because crypto is always open, it is the best market to watch the bot work live.',
      'Crypto hamesha khula rehta hai, isliye bot ko live kaam karte dekhne ke liye yeh best market hai.',
    ),
    related: ['market', 'symbol', 'arbitrage'],
  },
  {
    id: 'market-hours',
    category: 'basics',
    term: b('Market hours (open / closed)', 'Market hours (khula / band)'),
    short: b(
      'The times when a market allows trading.',
      'Woh time jab market mein trading hoti hai.',
    ),
    detail: b(
      'Stock markets open and close at fixed times in their own timezone, and close on weekends. When a market is closed the bot waits. Crypto never closes.',
      'Stock markets apne timezone mein fixed time pe khulte aur band hote hain, aur weekend pe band rehte hain. Market band ho toh bot intezaar karta hai. Crypto kabhi band nahi hota.',
    ),
    example: b(
      'NSE: 9:15 AM to 3:30 PM India time. US: 9:30 AM to 4:00 PM New York time (about 7 PM to 1:30 AM in India).',
      'NSE: subah 9:15 se dopahar 3:30 India time. US: 9:30 AM se 4:00 PM New York time (India mein lagbhag shaam 7 se raat 1:30).',
    ),
    why: b(
      'If you see "Market closed", nothing is broken. The bot simply waits.',
      'Agar "Market closed" dikhe, toh kuch kharab nahi hai. Bot bas intezaar kar raha hai.',
    ),
    related: ['market', 'delayed-data'],
  },
  {
    id: 'delayed-data',
    category: 'basics',
    term: b('Delayed data', 'Delayed data'),
    short: b('Prices that arrive a few minutes late.', 'Price jo kuch minute late aate hain.'),
    detail: b(
      'Free data sources sometimes show prices that are 15 minutes old. That is fine for learning, but real traders need live data.',
      'Free data sources kabhi-kabhi 15 minute purane price dikhate hain. Seekhne ke liye theek hai, lekin asli traders ko live data chahiye hota hai.',
    ),
    example: b(
      'India and Global prices here come from Yahoo and may be delayed. Crypto prices are live.',
      'Yahan India aur Global ke price Yahoo se aate hain aur late ho sakte hain. Crypto ke price live hain.',
    ),
    why: b(
      'Do not compare these prices second-by-second with a live broker app.',
      'In prices ko live broker app se second-by-second compare mat karo.',
    ),
    related: ['market-hours'],
  },

  // ---------------- Charts ----------------
  {
    id: 'price',
    category: 'charts',
    term: b('Price', 'Price (keemat)'),
    short: b('What one unit costs right now.', 'Abhi ek unit kitne ka hai.'),
    detail: b(
      'The price is the last amount someone paid for one share or one coin. It changes every time a new trade happens.',
      'Price woh aakhri rakam hai jo kisi ne ek share ya ek coin ke liye di. Har naye trade pe yeh badalta hai.',
    ),
    example: b(
      '"BTC/USDT 65,000" means one Bitcoin costs about 65,000 dollars right now.',
      '"BTC/USDT 65,000" matlab ek Bitcoin abhi lagbhag 65,000 dollar ka hai.',
    ),
    why: b(
      'Every chart, profit and loss in the app is built from prices.',
      'App ka har chart, profit aur loss price se hi banta hai.',
    ),
    related: ['candle', 'spread'],
  },
  {
    id: 'candle',
    category: 'charts',
    term: b('Candle (candlestick)', 'Candle (candlestick)'),
    short: b(
      'A bar that shows how the price moved in one time period.',
      'Ek bar jo ek time period mein price ka safar dikhata hai.',
    ),
    detail: b(
      'Each candle covers a fixed time, like 1 minute or 1 hour. The thick body shows where the price started and ended. The thin lines (wicks) show the highest and lowest point. Green means the price ended higher than it started; red means it ended lower.',
      'Har candle ek fixed time ki hoti hai, jaise 1 minute ya 1 ghanta. Moti body batati hai price kahan se shuru hua aur kahan khatam. Patli lines (wicks) sabse upar aur sabse neeche ka point batati hain. Green matlab price upar khatam hua; red matlab neeche.',
    ),
    example: b(
      'A green 1-hour candle from 100 to 104, with a wick up to 106 and down to 99, means: started 100, went as low as 99, as high as 106, ended at 104.',
      'Ek green 1-ghante ki candle 100 se 104, wick 106 tak upar aur 99 tak neeche: shuru 100, neeche 99 tak gaya, upar 106 tak, khatam 104 pe.',
    ),
    why: b(
      'Candles let you see a whole hour of fighting between buyers and sellers in one shape.',
      'Candle se poore ghante ki buyers-sellers ki ladai ek shape mein dikh jaati hai.',
    ),
    related: ['ohlc', 'timeframe', 'heikin-ashi'],
  },
  {
    id: 'ohlc',
    category: 'charts',
    term: b('OHLC (Open, High, Low, Close)', 'OHLC (Open, High, Low, Close)'),
    short: b(
      'The four prices that describe one candle.',
      'Chaar price jo ek candle ko describe karte hain.',
    ),
    detail: b(
      'Open is the first price in the period, High the highest, Low the lowest, and Close the last. The "Bars" chart draws the same four numbers as a vertical line with small ticks.',
      'Open period ka pehla price, High sabse upar, Low sabse neeche, aur Close aakhri price. "Bars" chart yahi chaar numbers ek seedhi line aur chhote ticks se dikhata hai.',
    ),
    example: b('O 100 · H 106 · L 99 · C 104.', 'O 100 · H 106 · L 99 · C 104.'),
    why: b(
      'Strategies in this app mostly look at the Close price of each candle.',
      'Is app ki strategies zyada tar har candle ka Close price dekhti hain.',
    ),
    related: ['candle', 'timeframe'],
  },
  {
    id: 'timeframe',
    category: 'charts',
    term: b('Timeframe (interval)', 'Timeframe (interval)'),
    short: b('How much time one candle covers.', 'Ek candle kitne time ki hai.'),
    detail: b(
      'Short timeframes (1m, 5m) show every small wiggle and lots of noise. Long timeframes (1h, 1d) hide the noise and show the bigger picture.',
      'Chhote timeframe (1m, 5m) har chhoti hilchal aur bahut noise dikhate hain. Lambe timeframe (1h, 1d) noise chhupa ke badi picture dikhate hain.',
    ),
    example: b(
      '1m = one candle per minute. 1d = one candle per day.',
      '1m = har minute ek candle. 1d = har din ek candle.',
    ),
    why: b(
      'The same strategy can behave very differently on 1-minute and 1-day candles.',
      'Ek hi strategy 1-minute aur 1-day candles pe bilkul alag behave kar sakti hai.',
    ),
    related: ['candle', 'trend'],
  },
  {
    id: 'volume',
    category: 'charts',
    term: b('Volume', 'Volume'),
    short: b('How much was traded in a period.', 'Ek period mein kitna trade hua.'),
    detail: b(
      'Volume counts how many shares or coins changed hands. A price move with high volume is usually more "believed" by the market than one with low volume.',
      'Volume ginta hai kitne shares ya coins ka len-den hua. Zyada volume ke saath price move ko market aksar zyada "serious" maanta hai.',
    ),
    example: b(
      'A breakout on 3x normal volume is stronger than one on tiny volume.',
      '3 guna normal volume wala breakout, chhote volume wale se zyada strong hota hai.',
    ),
    why: b(
      'Turn on the volume bars on the charts page to see it.',
      'Charts page pe volume bars on karke dekho.',
    ),
    related: ['breakout', 'candle'],
  },
  {
    id: 'trend',
    category: 'charts',
    term: b('Trend (uptrend / downtrend)', 'Trend (uptrend / downtrend)'),
    short: b('The general direction the price is moving.', 'Price ki general disha.'),
    detail: b(
      'An uptrend is a staircase going up: higher highs and higher lows. A downtrend is the opposite. When the price just moves up and down in a box, we call it sideways.',
      'Uptrend upar jaati seedhi jaisa hai: har high pichhle se upar, har low pichhle se upar. Downtrend iska ulta. Jab price ek box mein upar-neeche hota rahe, use sideways kehte hain.',
    ),
    example: b(
      'If a stock goes 100 → 104 → 102 → 108 → 106 → 112, that is an uptrend.',
      'Agar stock 100 → 104 → 102 → 108 → 106 → 112 jaaye, toh woh uptrend hai.',
    ),
    why: b(
      'Most strategies only work in one kind of trend. Picking the right one for the trend is half the game.',
      'Zyada tar strategies ek hi tarah ke trend mein chalti hain. Trend ke hisaab se sahi strategy chunna aadha khel hai.',
    ),
    related: ['market-mood', 'trend-following', 'sma'],
  },
  {
    id: 'heikin-ashi',
    category: 'charts',
    term: b('Heikin-Ashi', 'Heikin-Ashi'),
    short: b(
      'Smoothed candles that make trends easier to see.',
      'Smooth candles jinse trend aasaani se dikhe.',
    ),
    detail: b(
      'Heikin-Ashi means "average bar" in Japanese. Each candle is an average of the current and previous candle, so small wiggles disappear and long runs of one colour show a trend clearly. The prices shown are averages, not real trade prices.',
      'Heikin-Ashi ka matlab Japanese mein "average bar" hai. Har candle current aur pichhli candle ka average hai, isliye chhoti hilchal gayab ho jaati hai aur ek hi rang ki lambi line trend saaf dikhati hai. Dikhaye gaye price average hain, asli trade price nahi.',
    ),
    example: b(
      'Six green Heikin-Ashi candles in a row usually means a steady uptrend.',
      'Lagatar chhe green Heikin-Ashi candles aksar steady uptrend ka sign hai.',
    ),
    why: b(
      'Great for spotting the trend; do not use its prices for exact entries.',
      'Trend pehchanne ke liye badhiya; exact entry ke liye iske price use mat karo.',
    ),
    related: ['candle', 'trend'],
  },

  // ---------------- Orders & costs ----------------
  {
    id: 'order',
    category: 'orders',
    term: b('Order (buy / sell)', 'Order (buy / sell)'),
    short: b('An instruction to buy or sell.', 'Buy ya sell karne ka instruction.'),
    detail: b(
      'A buy order gets you into a position, a sell order gets you out. In this app the bot sends pretend orders and the app works out what would have happened, including costs and delays.',
      'Buy order se aap position mein aate ho, sell order se bahar. Is app mein bot nakli order bhejta hai aur app hisaab lagata hai ki asli mein kya hota, kharche aur delay ke saath.',
    ),
    example: b(
      '"Buy 0.01 BTC" is an order. When it completes, you hold 0.01 BTC.',
      '"0.01 BTC kharido" ek order hai. Poora hone pe aapke paas 0.01 BTC hai.',
    ),
    why: b(
      'Every line on the Trade History page is one order.',
      'Trade History page ki har line ek order hai.',
    ),
    related: ['fill', 'position', 'failed-order'],
  },
  {
    id: 'fill',
    category: 'orders',
    term: b('Fill (fill price)', 'Fill (fill price)'),
    short: b(
      'The actual price you got when your order completed.',
      'Order poora hone pe jo asli price mila.',
    ),
    detail: b(
      'The price on the screen and the price you actually get are rarely the same. The fill price includes the spread and slippage, so buys fill a little higher and sells a little lower.',
      'Screen wala price aur asli mila hua price shayad hi same hote hain. Fill price mein spread aur slippage shaamil hai, isliye buy thoda upar aur sell thoda neeche fill hota hai.',
    ),
    example: b(
      'Screen shows 100.00, your buy fills at 100.08.',
      'Screen pe 100.00, aapka buy 100.08 pe fill hua.',
    ),
    why: b(
      'This is why a trade at an unchanged price still loses a little money.',
      'Isi wajah se same price pe trade karne pe bhi thoda nuksaan hota hai.',
    ),
    related: ['spread', 'slippage', 'order'],
  },
  {
    id: 'spread',
    category: 'orders',
    term: b('Spread (bid / ask)', 'Spread (bid / ask)'),
    short: b(
      'The gap between the buying price and the selling price.',
      'Kharidne aur bechne ke price ka gap.',
    ),
    detail: b(
      'Sellers ask a little more (the ask), buyers bid a little less (the bid). If you buy and immediately sell, you lose this gap. It is like the difference between the buy and sell rate at a currency exchange counter.',
      'Seller thoda zyada maangta hai (ask), buyer thoda kam deta hai (bid). Turant buy karke sell karo toh yeh gap ka nuksaan hota hai. Jaise money exchange counter pe buy aur sell rate ka farak.',
    ),
    example: b(
      'Bid 99.95, ask 100.05: the spread is 0.10, or 0.1%.',
      'Bid 99.95, ask 100.05: spread 0.10 hai, yaani 0.1%.',
    ),
    why: b(
      'Small, frequent trades pay the spread again and again.',
      'Chhote, baar-baar ke trades har baar spread dete hain.',
    ),
    related: ['fill', 'slippage', 'fees'],
  },
  {
    id: 'slippage',
    category: 'orders',
    term: b('Slippage', 'Slippage'),
    short: b(
      'Extra cost when the price moves before your order fills.',
      'Order fill hone se pehle price hilne ka extra kharcha.',
    ),
    detail: b(
      'Orders take a moment to reach the market. In that moment the price may move against you. The app adds a small slippage to every fill to stay realistic.',
      'Order ko market tak pahunchne mein thoda time lagta hai. Us beech price aapke against hil sakta hai. Realistic rehne ke liye app har fill mein thoda slippage jodta hai.',
    ),
    example: b(
      'You click buy at 100.00; by the time it fills it is 100.05. That 0.05 is slippage.',
      'Aapne 100.00 pe buy dabaya; fill hote-hote 100.05 ho gaya. Woh 0.05 slippage hai.',
    ),
    why: b(
      'Strategies that look great without slippage often lose money with it.',
      'Bina slippage ke achhi dikhne wali strategies, slippage ke saath aksar loss karti hain.',
    ),
    related: ['fill', 'spread', 'delay'],
  },
  {
    id: 'fees',
    category: 'orders',
    term: b('Fees (brokerage)', 'Fees (brokerage)'),
    short: b(
      'What the broker or exchange charges per trade.',
      'Har trade pe broker ya exchange ka charge.',
    ),
    detail: b(
      'Most platforms take a small cut of every trade, sometimes a percent, sometimes a fixed amount. You can change the fee settings for each market in Settings.',
      'Zyada tar platforms har trade pe chhota hissa lete hain, kabhi percent, kabhi fixed amount. Har market ki fee Settings mein badal sakte ho.',
    ),
    example: b('A 0.1% fee on a $1,000 trade costs $1.', '$1,000 ke trade pe 0.1% fee = $1.'),
    why: b('Fees are charged on both the buy and the sell.', 'Fee buy aur sell dono pe lagti hai.'),
    related: ['taxes', 'spread', 'pnl'],
  },
  {
    id: 'taxes',
    category: 'orders',
    term: b('Taxes (STT, GST, stamp duty)', 'Taxes (STT, GST, stamp duty)'),
    short: b(
      'Government charges on trades, mainly in India.',
      'Trades pe sarkari charges, khaaskar India mein.',
    ),
    detail: b(
      'In India every share trade pays STT (Securities Transaction Tax), stamp duty on buys, GST on the broker fees, and a small DP charge when you sell delivery shares. US sells pay small SEC and FINRA fees.',
      'India mein har share trade pe STT (Securities Transaction Tax), buy pe stamp duty, broker fee pe GST, aur delivery shares bechne pe chhota DP charge lagta hai. US mein sell pe chhoti SEC aur FINRA fees lagti hain.',
    ),
    example: b(
      'Buying ₹1,00,000 of shares: STT ₹100 + stamp duty ₹15 + small exchange fees.',
      '₹1,00,000 ke shares lene pe: STT ₹100 + stamp duty ₹15 + chhoti exchange fees.',
    ),
    why: b(
      'These can eat a big part of small profits. The app charges them on every fill.',
      'Yeh chhote profits ka bada hissa kha sakte hain. App har fill pe inhe lagata hai.',
    ),
    related: ['fees', 'pnl'],
  },
  {
    id: 'delay',
    category: 'orders',
    term: b('Order delay', 'Order delay'),
    short: b(
      'The short wait before an order reaches the market.',
      'Order market tak pahunchne ka chhota intezaar.',
    ),
    detail: b(
      'Real orders are not instant. The app waits a little (for example 0.5 seconds), checks the price again, and fills at the new price.',
      'Asli orders turant nahi hote. App thoda rukta hai (jaise 0.5 second), price dobara check karta hai, aur naye price pe fill karta hai.',
    ),
    example: b('Crypto delay is 500 ms by default.', 'Crypto ka default delay 500 ms hai.'),
    why: b(
      'It is one of the reasons paper results here are closer to real life.',
      'Yahi ek wajah hai ki yahan ke paper results asli zindagi ke kareeb hain.',
    ),
    related: ['slippage', 'failed-order'],
  },
  {
    id: 'failed-order',
    category: 'orders',
    term: b('Failed order', 'Failed order'),
    short: b('An order that did not go through.', 'Order jo poora nahi hua.'),
    detail: b(
      'Sometimes real orders get rejected: the exchange is busy, the price moved too much, or the connection dropped. The app fails a small share of orders on purpose to copy this.',
      'Kabhi-kabhi asli orders reject ho jaate hain: exchange busy hai, price bahut hil gaya, ya connection toot gaya. App ise copy karne ke liye jaan-boojhkar thode orders fail karta hai.',
    ),
    example: b(
      'With a 1% fail chance, about 1 in 100 orders fails.',
      '1% fail chance ka matlab lagbhag 100 mein se 1 order fail.',
    ),
    why: b(
      'A good plan still works when some orders fail.',
      'Achha plan tab bhi chalta hai jab kuch orders fail hon.',
    ),
    related: ['order', 'delay'],
  },

  // ---------------- Money ----------------
  {
    id: 'wallet',
    category: 'money',
    term: b('Wallet', 'Wallet'),
    short: b(
      'A pot of fake money for one strategy in one market.',
      'Ek market mein ek strategy ke liye nakli paison ka dabba.',
    ),
    detail: b(
      'Each strategy gets its own wallet in each market, so their results never mix. "You" and "Bot" in the You vs Bot panel also each have their own wallet.',
      'Har strategy ko har market mein apna alag wallet milta hai, taaki results mix na hon. You vs Bot panel mein "Aap" aur "Bot" ka bhi apna-apna wallet hai.',
    ),
    example: b(
      'Trend Rider in Crypto has its own $10,000; Trend Rider in India has its own ₹10,00,000.',
      'Crypto mein Trend Rider ka apna $10,000; India mein Trend Rider ka apna ₹10,00,000.',
    ),
    why: b('Separate wallets make comparisons fair.', 'Alag wallets se comparison fair hota hai.'),
    related: ['cash', 'equity', 'position'],
  },
  {
    id: 'cash',
    category: 'money',
    term: b('Cash', 'Cash'),
    short: b(
      'Money in the wallet that is not invested right now.',
      'Wallet ka woh paisa jo abhi kahin laga nahi hai.',
    ),
    detail: b(
      'When you buy, cash goes down and you get a position. When you sell, the position turns back into cash (plus or minus your profit).',
      'Buy karne pe cash kam hota hai aur position milti hai. Sell karne pe position wapas cash ban jaati hai (profit ya loss ke saath).',
    ),
    example: b(
      'Start $10,000. Buy $2,000 of ETH → cash $8,000 + ETH position.',
      'Shuru $10,000. $2,000 ka ETH liya → cash $8,000 + ETH position.',
    ),
    why: b(
      'A strategy cannot buy when its cash runs out.',
      'Cash khatam toh strategy kharid nahi sakti.',
    ),
    related: ['wallet', 'equity', 'position'],
  },
  {
    id: 'position',
    category: 'money',
    term: b('Position (open position)', 'Position (open position)'),
    short: b('Something you bought and still hold.', 'Jo aapne kharida aur abhi bhi paas hai.'),
    detail: b(
      'A position is "open" from the moment you buy until you sell. While it is open its value moves with the price. Once sold, it is "closed" and the profit or loss becomes real.',
      'Position kharidne ke pal se bechne tak "open" rehti hai. Open rehne tak iski value price ke saath hilti hai. Bechne ke baad "closed" ho jaati hai aur profit ya loss pakka ho jaata hai.',
    ),
    example: b(
      'Holding 0.05 BTC bought at 60,000 is an open position.',
      '60,000 pe liya 0.05 BTC paas rakhna ek open position hai.',
    ),
    why: b(
      'Too many open positions at once means too much risk.',
      'Ek saath bahut saari open positions matlab bahut zyada risk.',
    ),
    related: ['unrealized-pnl', 'max-open-positions', 'cash'],
  },
  {
    id: 'equity',
    category: 'money',
    term: b('Equity (total balance)', 'Equity (total balance)'),
    short: b(
      'Cash plus the current value of everything you hold.',
      'Cash plus jo kuch paas hai uski abhi ki value.',
    ),
    detail: b(
      'Equity is what your wallet would be worth if you sold everything right now. It moves every time prices move.',
      'Equity woh hai jitna wallet abhi sab bech do toh banega. Har price move ke saath yeh hilti hai.',
    ),
    example: b(
      'Cash $8,000 + ETH now worth $2,300 = equity $10,300.',
      'Cash $8,000 + ETH ki abhi value $2,300 = equity $10,300.',
    ),
    why: b(
      'This is the main "how am I doing?" number.',
      'Yahi main "main kaisa kar raha hoon?" wala number hai.',
    ),
    related: ['cash', 'pnl', 'drawdown'],
  },
  {
    id: 'pnl',
    category: 'money',
    term: b('P&L (profit and loss)', 'P&L (profit aur loss)'),
    short: b('How much money you made or lost.', 'Kitna paisa bana ya gaya.'),
    detail: b(
      'P&L is the change from your starting money, after all costs. Green and a plus sign mean profit. Red and a minus sign mean loss.',
      'P&L shuru ke paise se badlaav hai, saare kharche ke baad. Green aur plus matlab profit. Red aur minus matlab loss.',
    ),
    example: b(
      'Started $10,000, now $10,300 → P&L +$300 (+3%).',
      'Shuru $10,000, ab $10,300 → P&L +$300 (+3%).',
    ),
    why: b(
      'Profit alone does not prove skill. Look at it together with risk and number of trades.',
      'Sirf profit skill sabit nahi karta. Risk aur trades ki ginti ke saath dekho.',
    ),
    related: ['realized-pnl', 'unrealized-pnl', 'return'],
  },
  {
    id: 'realized-pnl',
    category: 'money',
    term: b('Realized P&L', 'Realized P&L'),
    short: b(
      'Profit or loss from trades you have already closed.',
      'Band ho chuke trades ka profit ya loss.',
    ),
    detail: b(
      'Once you sell, the result is locked in. It can no longer change. That is realized P&L.',
      'Bechne ke baad result pakka ho jaata hai. Ab badal nahi sakta. Wahi realized P&L hai.',
    ),
    example: b(
      'Bought at 100, sold at 110, after costs +9.6 realized.',
      '100 pe liya, 110 pe becha, kharche ke baad +9.6 realized.',
    ),
    why: b(
      'The balance-over-time chart on Home is built from realized P&L.',
      'Home ka balance-over-time chart realized P&L se banta hai.',
    ),
    related: ['pnl', 'unrealized-pnl'],
  },
  {
    id: 'unrealized-pnl',
    category: 'money',
    term: b('Unrealized P&L', 'Unrealized P&L'),
    short: b(
      'Profit or loss "on paper" from positions still open.',
      'Abhi open positions ka "kaagaz pe" profit ya loss.',
    ),
    detail: b(
      'If you still hold something, its profit or loss can change every second. It only becomes real when you sell.',
      'Agar cheez abhi bhi paas hai, toh uska profit ya loss har second badal sakta hai. Bechne pe hi pakka hota hai.',
    ),
    example: b(
      'Bought at 100, price now 95 → unrealized −5. If it goes back to 105, that becomes +5.',
      '100 pe liya, abhi 95 → unrealized −5. Wapas 105 gaya toh +5.',
    ),
    why: b(
      'Do not celebrate or panic too early. It is not final until you sell.',
      'Jaldi khush ya pareshaan mat ho. Bechne tak final nahi hai.',
    ),
    related: ['pnl', 'realized-pnl', 'position'],
  },
  {
    id: 'return',
    category: 'money',
    term: b('Return (%)', 'Return (%)'),
    short: b(
      'Profit or loss as a percent of the starting money.',
      'Profit ya loss, shuru ke paise ke percent mein.',
    ),
    detail: b(
      'Percent lets you compare wallets with different amounts and currencies. +5% is +5% whether you started with $10,000 or ₹10,00,000.',
      'Percent se alag amount aur currency wale wallets compare ho jaate hain. +5% matlab +5%, chahe $10,000 se shuru karo ya ₹10,00,000 se.',
    ),
    example: b('$10,000 → $10,500 is a +5% return.', '$10,000 → $10,500 matlab +5% return.'),
    why: b(
      'Use percent, not raw money, when comparing markets.',
      'Markets compare karte waqt raw paisa nahi, percent dekho.',
    ),
    related: ['pnl', 'sharpe'],
  },

  // ---------------- Risk ----------------
  {
    id: 'risk',
    category: 'risk',
    term: b('Risk', 'Risk'),
    short: b(
      'How much you could lose if things go wrong.',
      'Galat hone pe kitna nuksaan ho sakta hai.',
    ),
    detail: b(
      'Every trade can lose. Managing risk means keeping each loss small enough that a bad day, or a bad week, does not wipe you out. The app has built-in limits to help.',
      'Har trade mein loss ho sakta hai. Risk manage karna matlab har loss itna chhota rakhna ki ek bura din ya bura hafta aapko khatam na kare. App mein iske liye limits pehle se hain.',
    ),
    example: b(
      'Putting 5% of your money in one trade is low risk. Putting 100% is very high risk.',
      'Ek trade mein 5% paisa lagana kam risk. 100% lagana bahut zyada risk.',
    ),
    why: b(
      'Pros care more about not losing big than about winning big.',
      'Pro traders bada jeetne se zyada bada na haarne ki fikar karte hain.',
    ),
    related: ['position-size', 'daily-loss-limit', 'drawdown', 'kill-switch'],
  },
  {
    id: 'position-size',
    category: 'risk',
    term: b('Position size (max trade %)', 'Position size (max trade %)'),
    short: b('How much money goes into one trade.', 'Ek trade mein kitna paisa lagta hai.'),
    detail: b(
      'The app never puts more than a set percent of the wallet into one new trade. Smaller sizes mean slower gains, but you survive losing streaks.',
      'App kabhi bhi ek naye trade mein wallet ka tay percent se zyada nahi lagata. Chhota size matlab dheere fayda, lekin lagatar losses mein bhi bache rehte ho.',
    ),
    example: b(
      'Max 10% of a $10,000 wallet = at most $1,000 per trade.',
      '$10,000 wallet ka max 10% = ek trade mein zyada se zyada $1,000.',
    ),
    why: b(
      'This single setting protects you more than any strategy.',
      'Yeh ek setting kisi bhi strategy se zyada bachaati hai.',
    ),
    related: ['risk', 'max-open-positions'],
  },
  {
    id: 'daily-loss-limit',
    category: 'risk',
    term: b('Daily loss limit', 'Daily loss limit'),
    short: b(
      'Stop opening new trades after losing a set amount in one day.',
      'Ek din mein tay nuksaan ke baad naye trades band.',
    ),
    detail: b(
      'If a wallet loses more than this percent in a day, it stops opening new trades until tomorrow. Closing existing ones is still allowed.',
      'Agar wallet ek din mein is percent se zyada haar jaaye, toh kal tak naye trades nahi khulenge. Purane band karna allowed hai.',
    ),
    example: b(
      'A 3% limit on $10,000: after losing $300 today, no new trades.',
      '$10,000 pe 3% limit: aaj $300 haarne ke baad koi naya trade nahi.',
    ),
    why: b(
      'It stops "revenge trading", trying to win it all back in a hurry.',
      'Yeh "revenge trading" rokta hai, yaani jaldi mein sab wapas jeetne ki koshish.',
    ),
    related: ['risk', 'kill-switch'],
  },
  {
    id: 'max-open-positions',
    category: 'risk',
    term: b('Max open positions', 'Max open positions'),
    short: b(
      'The most trades a wallet can hold at the same time.',
      'Ek wallet ek saath kitne trades rakh sakta hai.',
    ),
    detail: b(
      'Limiting how many things you hold at once stops one bad market move from hitting everything together.',
      'Ek saath kitni cheezein paas hon, ise limit karne se ek buri market move sab pe ek saath nahi padti.',
    ),
    example: b(
      'Limit 3: the bot will not buy a 4th symbol until it sells one.',
      'Limit 3: jab tak ek bechega nahi, bot chautha symbol nahi lega.',
    ),
    why: b(
      'Spreading out is good; spreading too thin is not.',
      'Thoda failana achha; bahut zyada failana nahi.',
    ),
    related: ['position', 'risk'],
  },
  {
    id: 'kill-switch',
    category: 'risk',
    term: b('Kill switch', 'Kill switch'),
    short: b('An emergency stop for all trading.', 'Saari trading ka emergency stop.'),
    detail: b(
      'Pressing the kill switch stops the bot and blocks every new trade on every market until you release it.',
      'Kill switch dabane se bot ruk jaata hai aur har market pe har naya trade tab tak band jab tak aap release na karo.',
    ),
    example: b(
      'Something looks wrong? Hit the kill switch in Settings first, investigate later.',
      'Kuch gadbad lage? Pehle Settings mein kill switch dabao, baad mein dekho.',
    ),
    why: b(
      'Every serious trading system has one. Know where it is.',
      'Har serious trading system mein hota hai. Pata hona chahiye kahan hai.',
    ),
    related: ['risk', 'daily-loss-limit'],
  },
  {
    id: 'drawdown',
    category: 'risk',
    term: b('Drawdown (biggest drop)', 'Drawdown (sabse bada girav)'),
    short: b(
      'How far the balance fell from its highest point.',
      'Balance apne sabse upar ke point se kitna gira.',
    ),
    detail: b(
      'Max drawdown is the worst fall from a peak to a low. It tells you how painful the ride was, even if it ended in profit.',
      'Max drawdown peak se low tak ka sabse bura girav hai. Yeh batata hai safar kitna dardnaak tha, chahe end mein profit hi kyun na ho.',
    ),
    example: b(
      'Balance went $10,000 → $11,000 → $9,900. Drawdown = 10% (from 11,000 to 9,900).',
      'Balance $10,000 → $11,000 → $9,900. Drawdown = 10% (11,000 se 9,900).',
    ),
    why: b(
      'A strategy with +20% return but 40% drawdown is very hard to stick with.',
      '+20% return lekin 40% drawdown wali strategy ke saath tike rehna bahut mushkil hai.',
    ),
    related: ['risk', 'sharpe', 'equity'],
  },

  // ---------------- Indicators ----------------
  {
    id: 'indicator',
    category: 'indicators',
    term: b('Indicator', 'Indicator'),
    short: b(
      'A formula on past prices that helps you read the chart.',
      'Purane price pe formula jo chart padhne mein madad kare.',
    ),
    detail: b(
      'Indicators turn raw prices into simpler signals, like "the average price" or "has it fallen too fast?". They look backwards, so they cannot predict the future, but they help you follow rules.',
      'Indicators raw price ko aasaan signals mein badalte hain, jaise "average price" ya "kya bahut tezi se gira?". Yeh peeche dekhte hain, future predict nahi karte, lekin rules follow karne mein madad karte hain.',
    ),
    example: b(
      'SMA, RSI and Bollinger bands are indicators.',
      'SMA, RSI aur Bollinger bands indicators hain.',
    ),
    why: b(
      'Every strategy in this app is built from one or two indicators.',
      'Is app ki har strategy ek-do indicators se bani hai.',
    ),
    related: ['sma', 'rsi', 'bollinger'],
  },
  {
    id: 'sma',
    category: 'indicators',
    term: b('SMA (simple moving average)', 'SMA (simple moving average)'),
    short: b(
      'The average closing price of the last N candles.',
      'Pichhli N candles ka average closing price.',
    ),
    detail: b(
      'Add up the last N closing prices and divide by N. As new candles arrive the average "moves". A fast SMA (small N) reacts quickly; a slow SMA (big N) is smoother.',
      'Pichhle N closing price jodo aur N se bhaag do. Nayi candles aane pe average "chalta" hai. Fast SMA (chhota N) jaldi react karta hai; slow SMA (bada N) smooth hota hai.',
    ),
    example: b('Closes 10, 11, 12 → SMA3 = 11.', 'Closes 10, 11, 12 → SMA3 = 11.'),
    why: b(
      'When the fast SMA crosses above the slow one, many traders read it as "trend turning up".',
      'Jab fast SMA slow ke upar cross kare, kai traders ise "trend upar mud raha hai" maante hain.',
    ),
    related: ['trend-following', 'trend', 'indicator'],
  },
  {
    id: 'rsi',
    category: 'indicators',
    term: b('RSI (relative strength index)', 'RSI (relative strength index)'),
    short: b(
      'A 0–100 score of how fast the price has been rising or falling.',
      '0–100 ka score ki price kitni tezi se upar ya neeche gaya.',
    ),
    detail: b(
      'RSI compares recent up moves with recent down moves. Below 30 usually means "fallen a lot, maybe too much" (oversold). Above 70 means "risen a lot" (overbought).',
      'RSI haal ke upar wale moves ko neeche wale moves se compare karta hai. 30 se neeche aksar matlab "bahut gira, shayad zyada hi" (oversold). 70 se upar matlab "bahut chadha" (overbought).',
    ),
    example: b(
      'After five red candles in a row, RSI might be 25 → oversold.',
      'Lagatar paanch red candles ke baad RSI 25 ho sakta hai → oversold.',
    ),
    why: b(
      'Rubber Band uses RSI to find prices that may bounce back.',
      'Rubber Band RSI se aise price dhoondhti hai jo wapas uchhal sakte hain.',
    ),
    related: ['mean-reversion', 'bollinger', 'indicator'],
  },
  {
    id: 'bollinger',
    category: 'indicators',
    term: b('Bollinger bands', 'Bollinger bands'),
    short: b(
      'Two lines around the average that show the "normal" price range.',
      'Average ke aas-paas do lines jo "normal" price range dikhati hain.',
    ),
    detail: b(
      'The middle line is a 20-candle average. The upper and lower bands sit 2 "standard deviations" away, which is a fancy way to say "how much the price usually wiggles". When the bands squeeze together, the price is calm, and a big move often follows.',
      'Beech wali line 20-candle average hai. Upar aur neeche ki bands 2 "standard deviation" door hoti hain, yaani "price aam taur pe kitna hilta hai". Jab bands paas aa jaati hain, price shaant hai, aur aksar uske baad bada move aata hai.',
    ),
    example: b(
      'Price drops below the lower band → unusually low compared to recent prices.',
      'Price lower band ke neeche → haal ke price ke mukable asaadharan kam.',
    ),
    why: b(
      'Rubber Band buys below the lower band; Auto-Pilot watches for squeezes.',
      'Rubber Band lower band ke neeche kharidti hai; Auto-Pilot squeeze pe nazar rakhta hai.',
    ),
    related: ['mean-reversion', 'market-mood', 'rsi'],
  },
  {
    id: 'breakout-level',
    category: 'indicators',
    term: b('High / low of the last N candles', 'Pichhli N candles ka high / low'),
    short: b(
      'The highest and lowest price in a recent window.',
      'Haal ke ek window ka sabse upar aur sabse neeche ka price.',
    ),
    detail: b(
      'Traders draw lines at the recent highest and lowest prices. Going above the recent high is called a breakout; falling below the recent low is a breakdown.',
      'Traders haal ke sabse upar aur sabse neeche price pe lines kheenchte hain. Recent high ke upar jaana breakout; recent low ke neeche girna breakdown.',
    ),
    example: b(
      '20-candle high is 105. A close at 106 is a breakout.',
      '20-candle high 105 hai. 106 pe close matlab breakout.',
    ),
    why: b(
      'Breakout Hunter is built entirely on these two lines.',
      'Breakout Hunter poori tarah in do lines pe bani hai.',
    ),
    related: ['breakout', 'volume'],
  },

  // ---------------- Strategies ----------------
  {
    id: 'strategy',
    category: 'strategies',
    term: b('Strategy', 'Strategy'),
    short: b(
      'A fixed set of rules for when to buy and when to sell.',
      'Kab buy aur kab sell, iske fixed rules.',
    ),
    detail: b(
      'A strategy removes guessing and emotions. The bot checks the rules on every new candle and says buy, sell or wait, with a reason.',
      'Strategy andaaze aur emotions hata deti hai. Bot har nayi candle pe rules check karta hai aur reason ke saath buy, sell ya wait bolta hai.',
    ),
    example: b(
      '"Buy when the 10-SMA crosses above the 30-SMA, sell when it crosses back below."',
      '"Jab 10-SMA 30-SMA ke upar cross kare tab kharido, wapas neeche cross kare tab becho."',
    ),
    why: b(
      'No strategy wins in every market mood. Learn which mood each one likes.',
      'Koi strategy har market mood mein nahi jeetti. Seekho kaunsi kis mood mein chalti hai.',
    ),
    related: ['trend-following', 'mean-reversion', 'breakout', 'auto-pilot'],
  },
  {
    id: 'trend-following',
    category: 'strategies',
    term: b('Trend following', 'Trend following'),
    short: b(
      'Ride the price in the direction it is already going.',
      'Price jis taraf ja raha hai, usi taraf chalo.',
    ),
    detail: b(
      'Trend followers buy after a rise has started and hold until it ends. They lose small amounts often in sideways markets, and win big during long trends.',
      'Trend followers tezi shuru hone ke baad kharidte hain aur khatam hone tak rakhte hain. Sideways market mein aksar chhote loss, lambe trends mein bade fayde.',
    ),
    example: b(
      'Trend Rider in this app is a trend-following strategy.',
      'Is app ki Trend Rider ek trend-following strategy hai.',
    ),
    why: b(
      'Best in clear uptrends. Worst in choppy, sideways markets.',
      'Saaf uptrend mein best. Uljhe, sideways market mein sabse buri.',
    ),
    related: ['sma', 'trend', 'market-mood'],
  },
  {
    id: 'mean-reversion',
    category: 'strategies',
    term: b('Mean reversion', 'Mean reversion'),
    short: b(
      'Bet that a price that fell too far will snap back to normal.',
      'Shart ki zyada gira price wapas normal pe aayega.',
    ),
    detail: b(
      'Like a stretched rubber band, prices that move too far from their average often come back. Mean reversion buys the dip and sells when the price returns to the middle.',
      'Khinche hue rubber band ki tarah, average se bahut door gaya price aksar wapas aata hai. Mean reversion dip pe kharidta hai aur price beech mein aane pe bechta hai.',
    ),
    example: b(
      'Rubber Band in this app is a mean-reversion strategy.',
      'Is app ki Rubber Band ek mean-reversion strategy hai.',
    ),
    why: b(
      'Best in sideways markets. Dangerous in strong downtrends (the band can keep stretching).',
      'Sideways market mein best. Strong downtrend mein khatarnaak (band aur khinchta reh sakta hai).',
    ),
    related: ['rsi', 'bollinger', 'market-mood'],
  },
  {
    id: 'breakout',
    category: 'strategies',
    term: b('Breakout', 'Breakout'),
    short: b(
      'Buy when the price escapes above its recent range.',
      'Jab price apni recent range se upar nikle tab kharido.',
    ),
    detail: b(
      'After a calm period, prices often make a sudden strong move. Breakout traders buy as soon as the price beats the recent high, hoping the move continues.',
      'Shaant period ke baad price aksar achanak strong move karta hai. Breakout traders price ke recent high todte hi kharidte hain, is ummeed mein ki move chalta rahe.',
    ),
    example: b(
      'Breakout Hunter buys above the 20-candle high and sells below the 10-candle low.',
      'Breakout Hunter 20-candle high ke upar kharidti hai aur 10-candle low ke neeche bechti hai.',
    ),
    why: b(
      'Best right after a quiet "squeeze". Many breakouts fail, so exits matter.',
      '"Squeeze" ke turant baad best. Kai breakouts fail hote hain, isliye exit zaroori hai.',
    ),
    related: ['breakout-level', 'volume', 'market-mood'],
  },
  {
    id: 'arbitrage',
    category: 'strategies',
    term: b('Arbitrage', 'Arbitrage'),
    short: b(
      'Buy where it is cheap and sell where it is expensive at the same time.',
      'Ek saath sasti jagah kharido aur mehngi jagah becho.',
    ),
    detail: b(
      'Sometimes the same coin has slightly different prices on two exchanges. Arbitrage tries to profit from that gap, but only if the gap is bigger than all the costs on both sides.',
      'Kabhi-kabhi ek hi coin ka do exchanges pe thoda alag price hota hai. Arbitrage us gap se kamaane ki koshish karta hai, lekin tabhi jab gap dono taraf ke saare kharchon se bada ho.',
    ),
    example: b(
      'BTC 65,000 on Kraken and 65,300 on Binance: gap 0.46%. If total costs are 0.3%, there is a small edge.',
      'Kraken pe BTC 65,000 aur Binance pe 65,300: gap 0.46%. Kul kharcha 0.3% ho toh chhota fayda.',
    ),
    why: b(
      'It looks "risk-free" but rarely is. This app does not model transfer costs, so treat its results with care.',
      '"Risk-free" lagta hai lekin aksar nahi hota. Yeh app transfer cost model nahi karta, isliye iske results dhyaan se dekho.',
    ),
    related: ['spread', 'fees', 'crypto'],
  },
  {
    id: 'market-mood',
    category: 'strategies',
    term: b('Market mood (regime)', 'Market mood (regime)'),
    short: b(
      'What kind of movement the market is in right now.',
      'Market abhi kis tarah ki chaal mein hai.',
    ),
    detail: b(
      'The bot sorts the market into moods: uptrend (going up), downtrend (going down), sideways (bouncing in a box), squeeze (very calm, a big move may come) or unclear. Different strategies suit different moods.',
      'Bot market ko moods mein baantta hai: uptrend (upar ja raha), downtrend (neeche ja raha), sideways (box mein uchhal raha), squeeze (bahut shaant, bada move aa sakta hai) ya unclear. Alag moods ke liye alag strategies.',
    ),
    example: b(
      'Sideways mood → Rubber Band. Uptrend → Trend Rider. Squeeze → Breakout Hunter.',
      'Sideways mood → Rubber Band. Uptrend → Trend Rider. Squeeze → Breakout Hunter.',
    ),
    why: b(
      'This is how Bot Auto-Pilot decides which strategy to use.',
      'Isi se Bot Auto-Pilot tay karta hai kaunsi strategy use kare.',
    ),
    related: ['auto-pilot', 'trend', 'bollinger'],
  },
  {
    id: 'auto-pilot',
    category: 'strategies',
    term: b('Bot Auto-Pilot', 'Bot Auto-Pilot'),
    short: b(
      'The bot reads the market mood and picks a strategy by itself.',
      'Bot market mood padh ke khud strategy chunta hai.',
    ),
    detail: b(
      'On every candle, Auto-Pilot works out the market mood and uses the strategy that usually suits that mood. In a downtrend or an unclear market it stays out. If the mood turns to downtrend while it holds something, it sells.',
      'Har candle pe Auto-Pilot market mood nikaalta hai aur us mood ke liye aam taur pe sahi strategy use karta hai. Downtrend ya unclear market mein bahar rehta hai. Kuch paas ho aur mood downtrend ho jaaye, toh bech deta hai.',
    ),
    example: b(
      'Mood sideways + price below the lower band → "Market is sideways, using Rubber Band: buy".',
      'Mood sideways + price lower band ke neeche → "Market sideways hai, Rubber Band use kar raha: buy".',
    ),
    why: b(
      'It is the "Bot" side in You vs Bot. Can you beat it with your own pick?',
      'You vs Bot mein yahi "Bot" hai. Kya aap apni pick se ise hara sakte ho?',
    ),
    related: ['market-mood', 'strategy', 'your-pick'],
  },
  {
    id: 'your-pick',
    category: 'strategies',
    term: b('Your Pick', 'Aapki Pick'),
    short: b(
      'The strategy you chose for a market in You vs Bot.',
      'You vs Bot mein kisi market ke liye aapki chuni strategy.',
    ),
    detail: b(
      'In the You vs Bot panel you pick one strategy per market from a dropdown. It trades with its own fake wallet, right next to the bot, so you can compare fairly.',
      'You vs Bot panel mein aap har market ke liye dropdown se ek strategy chunte ho. Woh bot ke bagal mein apne nakli wallet se trade karti hai, taaki fair comparison ho.',
    ),
    example: b(
      'You pick Rubber Band for Crypto; the bot uses Auto-Pilot. Both start with $10,000.',
      'Aapne Crypto ke liye Rubber Band chuni; bot Auto-Pilot use karta hai. Dono $10,000 se shuru.',
    ),
    why: b(
      'Changing your pick does not erase your history. Reset the match for a clean start.',
      'Pick badalne se history nahi mitti. Saaf shuruaat ke liye match reset karo.',
    ),
    related: ['auto-pilot', 'wallet'],
  },

  // ---------------- Results ----------------
  {
    id: 'backtest',
    category: 'results',
    term: b('Backtest (practice test)', 'Backtest (practice test)'),
    short: b(
      'Running a strategy on past prices to see how it would have done.',
      'Purane price pe strategy chala ke dekhna kaisa karti.',
    ),
    detail: b(
      'A backtest replays history candle by candle and applies the strategy rules with the same costs as live trading. It is a quick way to see if an idea is worth watching live.',
      'Backtest itihaas ko candle-by-candle dobara chalata hai aur live jaise kharchon ke saath strategy rules lagata hai. Idea live dekhne layak hai ya nahi, yeh jaldi pata chalta hai.',
    ),
    example: b(
      'Test Trend Rider on 60 days of 1-hour BTC candles.',
      'Trend Rider ko BTC ki 60 din ki 1-ghante candles pe test karo.',
    ),
    why: b(
      'Good past results do not guarantee future results. Use it to rule ideas out, not to prove them.',
      'Achhe purane results future ki guarantee nahi. Ideas ko reject karne ke liye use karo, prove karne ke liye nahi.',
    ),
    related: ['overfitting', 'sample-size', 'paper-trading'],
  },
  {
    id: 'win-rate',
    category: 'results',
    term: b('Win rate', 'Win rate'),
    short: b(
      'Out of all closed trades, the percent that made money.',
      'Saare closed trades mein se kitne percent ne paisa banaya.',
    ),
    detail: b(
      'A high win rate feels good but is not everything. A strategy can win 80% of the time and still lose overall if its few losses are huge.',
      'Zyada win rate achha lagta hai lekin sab kuch nahi. Strategy 80% baar jeet ke bhi overall haar sakti hai agar uske kuch loss bahut bade hon.',
    ),
    example: b(
      '7 winners out of 10 closed trades = 70% win rate.',
      '10 closed trades mein 7 winners = 70% win rate.',
    ),
    why: b(
      'Always look at win rate together with average win and average loss.',
      'Win rate hamesha average win aur average loss ke saath dekho.',
    ),
    related: ['profit-factor', 'sharpe'],
  },
  {
    id: 'sharpe',
    category: 'results',
    term: b('Sharpe ratio (steadiness score)', 'Sharpe ratio (steadiness score)'),
    short: b(
      'Return compared to how bumpy the ride was. Higher is steadier.',
      'Return, safar kitna jhatke wala tha uske mukable. Zyada matlab steady.',
    ),
    detail: b(
      'Two strategies can both make 10%. One got there smoothly; the other swung wildly up and down. Sharpe rewards the smooth one. Above 0 is better than doing nothing; the higher the better.',
      'Do strategies dono 10% bana sakti hain. Ek aaram se pahunchi; doosri bahut upar-neeche jhooli. Sharpe smooth wali ko inaam deta hai. 0 se upar kuch na karne se behtar; jitna zyada utna achha.',
    ),
    example: b(
      'Steady +1% every week has a much higher Sharpe than +20% then −15%.',
      'Har hafte steady +1% ka Sharpe, +20% phir −15% se kahin zyada hai.',
    ),
    why: b(
      'Strategy Scores ranks by Sharpe, not raw profit, because luck looks like profit for a while.',
      'Strategy Scores Sharpe se rank karta hai, raw profit se nahi, kyunki kuch time tak luck bhi profit jaisa dikhta hai.',
    ),
    related: ['drawdown', 'return', 'sample-size'],
  },
  {
    id: 'profit-factor',
    category: 'results',
    term: b('Profit factor', 'Profit factor'),
    short: b('Total money won divided by total money lost.', 'Kul jeeta paisa ÷ kul haara paisa.'),
    detail: b(
      'Above 1 means winners beat losers overall. Below 1 means you are losing money in total.',
      '1 se upar matlab winners ne losers ko overall hara diya. 1 se neeche matlab kul mila ke nuksaan.',
    ),
    example: b(
      'Won $600, lost $400 → profit factor 1.5.',
      '$600 jeete, $400 haare → profit factor 1.5.',
    ),
    why: b(
      'A quick health check that ignores how many trades won.',
      'Jaldi health check jo nahi dekhta kitne trades jeete.',
    ),
    related: ['win-rate', 'pnl'],
  },
  {
    id: 'sample-size',
    category: 'results',
    term: b('Enough trades (sample size)', 'Kaafi trades (sample size)'),
    short: b(
      'You need many trades before results mean anything.',
      'Results ka matlab tabhi jab bahut saare trades hon.',
    ),
    detail: b(
      'Five lucky trades can make a bad strategy look brilliant. This app only ranks a strategy after 30 closed trades.',
      'Paanch lucky trades buri strategy ko bhi zabardast dikha sakte hain. Yeh app strategy ko 30 closed trades ke baad hi rank karta hai.',
    ),
    example: b(
      '3 wins out of 3 is not proof. 60 wins out of 100 starts to mean something.',
      '3 mein 3 jeet koi saboot nahi. 100 mein 60 jeet ka kuch matlab banta hai.',
    ),
    why: b(
      'Be patient. Let strategies run for a week before judging.',
      'Sabr rakho. Judge karne se pehle strategies ko ek hafta chalne do.',
    ),
    related: ['sharpe', 'backtest'],
  },
  {
    id: 'overfitting',
    category: 'results',
    term: b('Overfitting', 'Overfitting'),
    short: b(
      'Tuning a strategy so much it only works on the past.',
      'Strategy ko itna tune karna ki sirf purane data pe chale.',
    ),
    detail: b(
      'If you keep tweaking numbers until the backtest looks perfect, you are teaching the strategy to memorise history, not to trade. It will likely fail on new prices.',
      'Agar backtest perfect dikhne tak numbers badalte raho, toh strategy itihaas ratt rahi hai, trade karna nahi seekh rahi. Naye price pe aksar fail hogi.',
    ),
    example: b(
      'SMA 13/37 looks amazing, but 12/36 and 14/38 lose money → overfit.',
      'SMA 13/37 zabardast dikhe, lekin 12/36 aur 14/38 loss karein → overfit.',
    ),
    why: b(
      'Prefer simple settings that work "okay" across many periods and markets.',
      'Simple settings chuno jo kai periods aur markets mein "theek-thaak" chalein.',
    ),
    related: ['backtest', 'sample-size'],
  },

  // ---------------- App ----------------
  {
    id: 'bot',
    category: 'app',
    term: b('The bot', 'Bot'),
    short: b(
      'The program that runs strategies and places paper trades for you.',
      'Program jo strategies chalata hai aur aapke liye paper trades karta hai.',
    ),
    detail: b(
      'When you press Start, the bot checks each market on a timer (crypto every 15 seconds), runs every switched-on strategy, applies risk limits, and records what it did and why.',
      'Start dabane pe bot har market ko timer pe check karta hai (crypto har 15 second), har on strategy chalata hai, risk limits lagata hai, aur kya kiya aur kyun, record karta hai.',
    ),
    example: b(
      '"Bought ETH because SMA10 crossed above SMA30" is a bot decision with its reason.',
      '"ETH kharida kyunki SMA10 ne SMA30 ko upar cross kiya" reason ke saath bot ka faisla hai.',
    ),
    why: b(
      'It can never place a real order. It is for learning only.',
      'Yeh kabhi asli order nahi daal sakta. Sirf seekhne ke liye hai.',
    ),
    related: ['paper-trading', 'strategy', 'kill-switch'],
  },
  {
    id: 'xp',
    category: 'app',
    term: b('XP, levels, quests and badges', 'XP, levels, quests aur badges'),
    short: b(
      'Points for good habits, never for profit.',
      'Achhi aadaton ke points, profit ke kabhi nahi.',
    ),
    detail: b(
      'You earn XP for learning habits: running practice tests, comparing strategies, reviewing losing trades, and staying inside your risk limits. Making money, big trades or many trades never earn XP.',
      'XP seekhne ki aadaton se milta hai: practice tests chalana, strategies compare karna, haare trades review karna, aur risk limits ke andar rehna. Paisa banana, bade trades ya bahut trades se kabhi XP nahi milta.',
    ),
    example: b(
      'Reviewing a losing trade with an honest note earns XP.',
      'Haare trade ko honest note ke saath review karne pe XP milta hai.',
    ),
    why: b(
      'Good habits matter more than any single winning trade.',
      'Achhi aadatein kisi ek jeete trade se zyada maayne rakhti hain.',
    ),
    related: ['backtest', 'risk'],
  },
];

export const TERM_BY_ID = new Map(GLOSSARY.map((t) => [t.id, t]));
