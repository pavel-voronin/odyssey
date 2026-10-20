// Reusable pieces of the world. Their properties drive decisions and consequences.
export const PROFESSIONS = [
  { id: 'soldier', name: 'Бывший солдат', talent: 'Стойка ветерана', stats: [4, 1, 1, 1, 2], attack: 2, skill: 'physical', story: 'Война закончилась. Привычка защищать людей осталась.' },
  { id: 'mage', name: 'Самоучка маг', talent: 'Искра в ладони', stats: [1, 4, 1, 2, 3], attack: 1, skill: 'magic', story: 'Первое заклинание сожгло диплом. Второе должно всё исправить.' },
  { id: 'alchemist', name: 'Полевой алхимик', talent: 'Живая настойка', stats: [1, 4, 2, 2, 2], attack: 0, skill: 'healing', story: 'У каждой болезни есть лекарство. У каждого лекарства — побочный эффект.' },
  { id: 'ranger', name: 'Следопыт', talent: 'След на мокрой земле', stats: [3, 2, 3, 1, 2], attack: 1, skill: 'beast', story: 'Лес разговаривает следами. Люди почему-то всё ещё словами.' },
  { id: 'thief', name: 'Благородный вор', talent: 'Позаимствованная удача', stats: [1, 2, 5, 3, 1], attack: 0, skill: 'steal', story: 'Он обещал начать честную жизнь. Не уточнил, с какого утра.' },
  { id: 'bard', name: 'Странствующий бард', talent: 'Песнь второго шанса', stats: [1, 2, 3, 3, 4], attack: 0, skill: 'parley', story: 'Знает сто баллад. Ищет историю, достойную сто первой.' },
  { id: 'scholar', name: 'Исследователь невозможного', talent: 'Несуществующая сноска', stats: [1, 5, 1, 2, 3], attack: 0, skill: 'relic', story: 'Карта утверждает, что здесь ничего нет. Тем интереснее.' },
  { id: 'merchant', name: 'Разорившийся купец', talent: 'Честная наценка', stats: [1, 3, 3, 4, 1], attack: 0, skill: 'trade', story: 'Потерял караван. Сохранил счётную книгу и подозрительный оптимизм.' },
  { id: 'sailor', name: 'Моряк без корабля', talent: 'Солёная интуиция', stats: [3, 2, 2, 3, 2], attack: 1, skill: 'sea', story: 'Океан выбросил его на сушу. Суша пока не знает, что делать.' },
  { id: 'smith', name: 'Кузнец-пилигрим', talent: 'Железное терпение', stats: [4, 3, 1, 1, 2], attack: 1, skill: 'craft', story: 'Ищет металл, который выдержит вес собственного обещания.' },
  { id: 'undertaker', name: 'Проводник покойных', talent: 'Последняя любезность', stats: [2, 3, 1, 2, 5], attack: 0, skill: 'spirit', story: 'Мёртвые редко врут. Иногда просто забывают, что умерли.' },
  { id: 'clockmaker', name: 'Часовщик', talent: 'Лишняя секунда', stats: [1, 5, 3, 2, 2], attack: 0, skill: 'time', story: 'Карманные часы идут назад. Он считает это перспективой.' }
];
// Resident roles are lookup profiles, not additional random adventurer origins.
export const NPC_PROFESSIONS=[['farmer','Земледелец','ranger'],['healer','Травник','alchemist'],['artisan','Ремесленник','smith'],['scholar','Летописец','scholar'],['guard','Страж','soldier'],['merchant','Торговец','merchant'],['student','Ученик','scholar']].map(([job,name,base])=>({...PROFESSIONS.find(p=>p.id===base),id:'npc-'+job,name,story:'Житель мира продолжает собственное дело.',talent:'Опыт повседневной работы'}));
NPC_PROFESSIONS.push({id:'npc-laborer',name:'Подёнщик',story:'Взрослый житель без обученной профессии.',talent:'Учится собственным трудом',skill:'labor',stats:[3,3,3,3,3]});
export const DESTINIES = [
  { id: 'atlas', name: 'Карта невозможного', text: 'Увидеть двенадцать мест, которых нет на старых картах.', target: 12, counter: 'places', reward: 'Звание: Ходящий за горизонт' },
  { id: 'hoard', name: 'Богатство на чёрный день', text: 'Сберечь сто монет. На всякий случай. Даже если случай никогда не наступит.', target: 100, counter: 'gold', reward: 'Звание: Хранитель сокровищ' },
  { id: 'protector', name: 'Три выполненных обещания', text: 'Помочь трём поселениям и доказать, что слово что-то значит.', target: 3, counter: 'quests', reward: 'Звание: Тот, кто возвращается' },
  { id: 'hunter', name: 'Имена чудовищ', text: 'Пережить десять встреч, о которых страшно писать.', target: 10, counter: 'kills', reward: 'Звание: Укротитель страха' },
  { id: 'relics', name: 'Археология будущего', text: 'Найти четыре реликвии и понять, почему они помнят завтрашний день.', target: 4, counter: 'relics', reward: 'Звание: Читатель веков' },
  { id: 'friends', name: 'Семья, которую выбирают', text: 'Найти трёх спутников: людей, зверей или невозможных собеседников.', target: 3, counter: 'companions', reward: 'Звание: Никто не один' },
  { id: 'kindness', name: 'Маленькое добро', text: 'Совершить шесть добрых поступков, даже когда никто не смотрит.', target: 6, counter: 'kindness', reward: 'Звание: Свет на обочине' },
  { id: 'notoriety', name: 'Дурная слава', text: 'Пять раз предпочесть выгоду чужому покою. Посмотреть, кто останется рядом.', target: 5, counter: 'mischief', reward: 'Звание: Тень под фонарём' },
  { id: 'survivor', name: 'Пожить подольше', text: 'Дожить до восьмого дня. Это уже достаточно дерзкий план.', target: 768, counter: 'age', reward: 'Звание: Упрямое настоящее' }
];
export const HABITS = [
  { id: 'hoarder', name: 'Скопидом', text: 'Держит находки до последнего и реже тратит накопления.' },
  { id: 'tea', name: 'Чайный ритуал', text: 'Заваривает травы на отдыхе: снимает усталость и ускоряет лечение.' },
  { id: 'mercy', name: 'Не бить первым', text: 'Пытается договориться с разумными противниками.' },
  { id: 'reckless', name: 'Ещё один поворот', text: 'Любопытство заставляет рисковать в незнакомых местах.' },
  { id: 'diary', name: 'Ведёт дневник', text: 'Открытия и реликвии приносят дополнительный опыт.' },
  { id: 'gambler', name: 'Верит в удачу', text: 'Играет с судьбой, даже когда та предлагает дурные условия.' },
  { id: 'generous', name: 'Делится последним', text: 'Помогает путникам и отдаёт монеты в обмен на дружбу.' },
  { id: 'suspicious', name: 'Проверяет карманы', text: 'Лучше замечает ловушки и попытки ограбления.' },
  { id: 'collector', name: 'Коллекционер странностей', text: 'Предпочитает необычные предметы самой выгодной покупке.' },
  { id: 'stargazer', name: 'Считает звёзды', text: 'Ночные открытия запоминаются особенно хорошо.' },
  { id: 'homebody', name: 'Помнит дорогу домой', text: 'Возвращается к знакомому лекарю и не любит долгие походы.' },
  { id: 'superstitious', name: 'Не наступает на тени', text: 'Относится к проклятым вещам и святилищам с осторожностью.' }
];
export const CONDITIONS = {
  poison: { name: 'Отравление', text: 'Теряет здоровье каждые восемь мигов; лекарь умеет лечить.', duration: 42 },
  fever: { name: 'Болотная лихорадка', text: 'Путешествие сильнее утомляет; отдых у лекаря снимает жар.', duration: 90 },
  insomnia: { name: 'Бессонница', text: 'Силы восстанавливаются медленнее. Чай и лекарь помогают.', duration: 130 },
  curse: { name: 'Печать неудачи', text: 'Проклятие притягивает беды. Святилище или лекарь могут его снять.', duration: 180 },
  frost: { name: 'Обморожение', text: 'Идёт медленнее; тепло и время возвращают подвижность.', duration: 55 },
  inspiration: { name: 'Вдохновение', text: 'Песни, находки и добрые встречи усиливают следующий бой.', duration: 50 },
  blessing: { name: 'Попутная звезда', text: 'Незримая помощь бережёт здоровье в сражениях.', duration: 120 }
};
export const ENEMY_SPECIES = [
  { id: 'wolf', name: 'Лесной волк', biomes: ['forest', 'road'], hp: 15, attack: 4, tags: ['beast'], shape: 'wolf' },
  { id: 'fungus', name: 'Грибной рыцарь', biomes: ['forest', 'cave'], hp: 19, attack: 3, tags: ['plant'], shape: 'fungus' },
  { id: 'bandit', name: 'Сборщик чужих налогов', biomes: ['forest', 'road', 'port'], hp: 18, attack: 4, tags: ['human'], shape: 'human' },
  { id: 'slime', name: 'Слизь с амбициями', biomes: ['forest', 'cave', 'island'], hp: 22, attack: 3, tags: ['ooze'], shape: 'slime' },
  { id: 'guard', name: 'Страж руин', biomes: ['ruins', 'cave'], hp: 23, attack: 6, tags: ['construct'], shape: 'guard' },
  { id: 'ghost', name: 'Потерявшееся эхо', biomes: ['ruins', 'cave', 'dream'], hp: 15, attack: 5, tags: ['spirit'], shape: 'ghost' },
  { id: 'mimic', name: 'Неприлично голодный сундук', biomes: ['ruins', 'cave', 'road'], hp: 25, attack: 5, tags: ['mimic'], shape: 'chest' },
  { id: 'dragon', name: 'Молодой дракон', biomes: ['ruins', 'island', 'forest'], hp: 29, attack: 6, tags: ['beast', 'magic'], shape: 'dragon' },
  { id: 'crab', name: 'Краб казначейства', biomes: ['sea', 'island', 'port'], hp: 20, attack: 4, tags: ['beast', 'armored'], shape: 'crab' },
  { id: 'pirate', name: 'Пират без лицензии', biomes: ['sea', 'island', 'port'], hp: 22, attack: 5, tags: ['human'], shape: 'human' },
  { id: 'wyrm', name: 'Подземный червь', biomes: ['cave'], hp: 28, attack: 6, tags: ['beast'], shape: 'worm' },
  { id: 'automaton', name: 'Заводной инспектор', biomes: ['ruins', 'clockwork'], hp: 23, attack: 5, tags: ['construct'], shape: 'guard' },
  { id: 'angel', name: 'Уволенный небожитель', biomes: ['dream', 'ruins'], hp: 25, attack: 6, tags: ['spirit', 'magic'], shape: 'ghost' },
  { id: 'notary', name: 'Демонический нотариус', biomes: ['dream', 'road', 'ruins'], hp: 24, attack: 5, tags: ['human', 'magic'], shape: 'human' }
];
export const ENEMY_POWERS = [
  { id: 'plain', name: 'обычный', text: 'Полагается на когти, зубы и плохое настроение.' },
  { id: 'venom', name: 'ядовитый', text: 'Его удары могут отравить.' },
  { id: 'regrowth', name: 'регенерация', text: 'Восстанавливается между ударами; магия мешает регенерации.' },
  { id: 'armored', name: 'каменная кожа', text: 'Броня ослабляет обычные удары, но хуже защищает от магии.' },
  { id: 'vampire', name: 'вампиризм', text: 'Возвращает часть здоровья, нанося раны.' },
  { id: 'thief', name: 'карманник', text: 'В бою крадёт монеты; добычу можно вернуть после победы.' },
  { id: 'frost', name: 'ледяное сердце', text: 'Может замедлить героя холодом.' },
  { id: 'fury', name: 'последняя ярость', text: 'Становится опаснее на исходе здоровья.' },
  { id: 'hex', name: 'дурной глаз', text: 'Может наложить печать неудачи.' },
  { id: 'temporal', name: 'лишняя секунда', text: 'Иногда уклоняется между мгновениями.' },
  { id: 'swarm', name: 'множество тел', text: 'Много слабых атак. Хорошая броня особенно полезна.' },
  { id: 'spore', name: 'болотные споры', text: 'Может оставить после боя лихорадку.' }
];
export const ITEM_BASES = [
  { id: 'whistle', name: 'дорожная свистулька', slot: 'charm', stat: 'spirit', craftOnly:true },
  { id: 'blade', name: 'клинок', slot: 'weapon', stat: 'attack' },
  { id: 'axe', name: 'топор', slot: 'weapon', stat: 'attack' },
  { id: 'staff', name: 'посох', slot: 'weapon', stat: 'magic' },
  { id: 'coat', name: 'плащ', slot: 'armor', stat: 'defense' },
  { id: 'mail', name: 'доспех', slot: 'armor', stat: 'defense' },
  { id: 'ring', name: 'перстень', slot: 'charm', stat: 'luck' },
  { id: 'compass', name: 'компас', slot: 'charm', stat: 'spirit' },
  { id: 'watch', name: 'хронометр', slot: 'charm', stat: 'wit' },
  { id: 'spoon', name: 'серебряная ложка', slot: 'charm', stat: 'luck' },
  { id: 'idol', name: 'идол', slot: 'charm', stat: 'spirit' }
];
export const ITEM_ORIGINS = ['дорожный', 'лунный', 'солёный', 'заводной', 'погребальный', 'звёздный', 'драконий', 'забытый', 'грибной', 'королевский'];
export const ITEM_MODIFIERS={plain:'Без особой печати',blessing:'Благословение',time:'Отпечаток времени',greed:'Скупость',curse:'Проклятие',luck:'Удача',healing:'Память костра',spirit:'След духа',explore:'Зов дороги'};
export const ITEM_EPITHETS = [
  { name: 'первого рассвета', modifier: 'blessing' }, { name: 'запасного плана', modifier: 'plain' },
  { name: 'непрошедшего завтра', modifier: 'time' }, { name: 'скупого короля', modifier: 'greed' },
  { name: 'с оговоркой мелким шрифтом', modifier: 'curse' }, { name: 'честного пирата', modifier: 'luck' },
  { name: 'последнего костра', modifier: 'healing' }, { name: 'забытого имени', modifier: 'spirit' },
  { name: 'совершенно обычного вторника', modifier: 'plain' }, { name: 'потерянной экспедиции', modifier: 'explore' }
];
export const ENCOUNTERS = [
  { id: 'pilgrim', name: 'Путник с пустой сумкой', kind: 'encounter', icon: 'human', x: 31 },
  { id: 'shrine', name: 'Святилище двух обещаний', kind: 'encounter', icon: 'shrine', x: 63 },
  { id: 'sealed', name: 'Запечатанный сундук', kind: 'encounter', icon: 'chest', x: 23 },
  { id: 'familiar', name: 'Нечто, ищущее хозяина', kind: 'encounter', icon: 'pet', x: 82 },
  { id: 'gambler', name: 'Игрок в кости с судьбой', kind: 'encounter', icon: 'human', x: 18 },
  { id: 'burial', name: 'Неподписанная могила', kind: 'encounter', icon: 'grave', x: 72 },
  { id: 'spring', name: 'Источник с сомнительной репутацией', kind: 'encounter', icon: 'spring', x: 22 },
  { id: 'cartographer', name: 'Картограф с дырявой картой', kind: 'encounter', icon: 'human', x: 89 }
];
export const PETS = [
  { id: 'fox', name: 'Лиса с серебряными ушами', role: 'pet', attack: 1, healing: 0, scouting: 2, loyalty: 45 },
  { id: 'cat', name: 'Кот, который уже всё понял', role: 'pet', attack: 0, healing: 0, scouting: 3, loyalty: 35 },
  { id: 'moth', name: 'Моль из непрожитого сна', role: 'familiar', attack: 1, healing: 1, scouting: 1, loyalty: 50 },
  { id: 'owl', name: 'Филин с дипломом', role: 'familiar', attack: 0, healing: 1, scouting: 3, loyalty: 55 },
  { id: 'mushroom', name: 'Карманный гриб-советник', role: 'familiar', attack: 1, healing: 2, scouting: 0, loyalty: 60 },
  { id: 'dog', name: 'Пёс по имени Завтра', role: 'pet', attack: 2, healing: 0, scouting: 1, loyalty: 70 }
];
export const FACTIONS = [
  { id: 'lantern', name: 'Орден дорожных фонарей', color: '#cedb91', motto: 'Никто не должен исчезнуть на дороге.' },
  { id: 'crown', name: 'Канцелярия последней короны', color: '#d1af7f', motto: 'У порядка всегда найдётся печать.' },
  { id: 'tide', name: 'Братство солёного ветра', color: '#8dbec0', motto: 'Все берега когда-нибудь становятся чужими.' },
  { id: 'root', name: 'Совет глубоких корней', color: '#9dbf82', motto: 'Лес помнит больше, чем люди признают.' },
  { id: 'clock', name: 'Гильдия лишней секунды', color: '#b6a3d5', motto: 'Настоящее — вопрос договорённости.' }
];
export const STAT_NAMES = { might: 'Сила', wit: 'Разум', guile: 'Хитрость', luck: 'Удача', spirit: 'Дух' };
export function profession(id) { return PROFESSIONS.find(p => p.id === id) || NPC_PROFESSIONS.find(p=>p.id===id) || PROFESSIONS[0]; }
export function destiny(id) { return DESTINIES.find(d => d.id === id) || DESTINIES[0]; }
export function habit(id) { return HABITS.find(h => h.id === id); }

export const RACES = [
  {id:'human',name:'Человек',height:1,skin:'#cfb28c',bonus:{luck:1},ability:'Приспособляемость: дополнительная удача.'},
  {id:'elf',name:'Эльф',height:1.12,skin:'#d0c9a2',bonus:{wit:1,spirit:1},ability:'Слух леса: легче понять волшебных существ.'},
  {id:'dwarf',name:'Дварф',height:.8,skin:'#c3a27e',bonus:{might:2},ability:'Горная выдержка: яд и холод слабее.'},
  {id:'goblin',name:'Гоблин',height:.78,skin:'#91a779',bonus:{guile:2},ability:'Проворные пальцы: лучше замечает ловушки.'},
  {id:'orc',name:'Орк',height:1.2,skin:'#92a080',bonus:{might:2},ability:'Крепкая кожа: меньше боевых ран.'},
  {id:'halfling',name:'Полурослик',height:.7,skin:'#d1b18a',bonus:{luck:2},ability:'Счастливый случай: иногда уходит от удара.'},
  {id:'fae',name:'Фейри',height:.66,skin:'#c5b2ce',bonus:{spirit:2},ability:'Иной взгляд: знает дорогу к снам.'},
  {id:'dragonkin',name:'Драконорождённый',height:1.15,skin:'#9fb4a0',bonus:{might:1,spirit:1},ability:'Осколок пламени: драконье наследие усиливает магию.'},
  {id:'automaton',name:'Автоматон',height:1,skin:'#a7b5b4',bonus:{wit:2},ability:'Механическое тело: медленнее устаёт от голода.'},
  {id:'myconid',name:'Миконид',height:.9,skin:'#c1ae96',bonus:{spirit:2},ability:'Грибная симпатия: споры почти не вредят.'},
  {id:'revenant',name:'Возвращённый',height:1.03,skin:'#b4c3bc',bonus:{spirit:1,wit:1},ability:'Тихая кровь: яд менее опасен, покойные узнают своего.'},
  {id:'gnome',name:'Гном',height:.72,skin:'#cfb39b',bonus:{wit:1,guile:1},ability:'Любовь к механизмам: понимает часы и древние автоматы.'}
];
export const FAMILIES = ['Ветрогон','Ясень','Сольвей','Ржавый Ключ','Семь Костей','Пепельный','Лунная Нить','Тихий Колокол','Дальний Берег','Медный Лист','Безымянный Дом','Чёрный Чай'];
export const APPEARANCES = {
  hair:['#4d493a','#926a43','#c1b894','#42454d','#b18c68','#b7bcbc'],
  cloak:['#8b9864','#819aa3','#aa7c65','#8d7a99','#b4a578','#788a85','#a29487'],
  marks:['родинка под глазом','перевязанная рука','старый шрам','выцветшая татуировка','медный серьга','веснушки','пустой рукав','седая прядь']
};
export const PSYCHOLOGIES = [
  {id:'steady',name:'Ровный нрав',text:'Старается не отдавать решения страху или азарту.'},
  {id:'anxious',name:'Тревожность',text:'При сильном напряжении чаще ищет безопасное место.'},
  {id:'claustrophobic',name:'Боится тесноты',text:'Пещеры и замкнутые пространства требуют больше решимости.'},
  {id:'obsessive',name:'Незаконченные дела',text:'Нарушенное обещание не даёт покоя; предпочитает возвращаться к заданиям.'},
  {id:'melancholy',name:'Меланхолия',text:'Разговоры и забота о спутниках помогают справляться с тяжестью дороги.'},
  {id:'restless',name:'Неугомонность',text:'Долгое пребывание на одном месте тяготит; чаще ищет новые пути.'},
  {id:'superstition',name:'Ритуальное мышление',text:'Бросает монетку на развилках. Называет это советом предков.'},
  {id:'fearbeasts',name:'Страх зверей',text:'Клыки и рычание тревожат сильнее прочих угроз.'}
];
export const SPELLS = [
  {id:'spark',name:'Искра',kind:'damage',mana:4,power:8,cooldown:3,text:'Маленький огонь; обходит каменную броню.'},
  {id:'mend',name:'Сшить рану',kind:'heal',mana:6,power:12,cooldown:6,text:'Лечит раны, когда опасность ещё рядом.'},
  {id:'ward',name:'Слово укрытия',kind:'ward',mana:5,power:4,cooldown:8,text:'На несколько мигов даёт защиту.'},
  {id:'lullaby',name:'Колыбельная для чудовища',kind:'pacify',mana:9,power:0,cooldown:12,text:'Иногда разрешает конфликт без убийства.'},
  {id:'borrow',name:'Занять секунду',kind:'time',mana:7,power:6,cooldown:7,text:'Удар между мгновениями без ответной атаки.'},
  {id:'roots',name:'Корни под ногами',kind:'damage',mana:8,power:14,cooldown:5,text:'Сила леса особенно действенна против механизмов.'},
  {id:'bluefire',name:'Синий огонь',kind:'damage',mana:10,power:19,cooldown:8,text:'Рискованная магия, оставляющая мало пространства для сомнений.'},
  {id:'unhex',name:'Назвать настоящим именем',kind:'cleanse',mana:7,power:0,cooldown:9,text:'Снимает яд, жар и дурную печать.'}
];
export const JOBS = [
  {id:'harvest',name:'Работать на угодьях',skills:[],pay:4,duration:5,text:'Собранное остаётся в местной кладовой; плата идёт из казны.'},
  {id:'song',name:'Спеть в трактире',skills:['parley'],pay:9,duration:4,text:'Слушатели платят за песню и вечер без дурных новостей.'},
  {id:'repair',name:'Починить инструменты',skills:['craft','time'],pay:10,duration:5,text:'Работа руками кормит не хуже сомнительного подвига.'},
  {id:'medicine',name:'Помочь лекарю',skills:['healing','spirit'],pay:8,duration:4,text:'Травы, повязки и спокойные слова. Победа без противника.'},
  {id:'records',name:'Разобрать архив',skills:['relic','magic'],pay:9,duration:5,text:'В пыльных бумагах находится заработок, а иногда и чужой секрет.'},
  {id:'market',name:'Помочь на рынке',skills:['trade','steal'],pay:10,duration:4,text:'Монеты приходят через умение торговаться, а не через чужую кровь.'},
  {id:'dock',name:'Разгрузить припасы',skills:['sea','physical','beast'],pay:8,duration:4,text:'Тяжёлые ящики, честная плата и разговоры о дальних берегах.'}
];
export function race(id){return RACES.find(r=>r.id===id)||RACES[0];}

export const BIOMES = {
  road:{name:'Дорога',risk:0},village:{name:'Поселение',risk:0,town:true},forest:{name:'Лес',risk:2},ruins:{name:'Руины',risk:3},camp:{name:'Стоянка',risk:0,refuge:true},
  cave:{name:'Пещера',risk:3,realm:'underground'},dungeon:{name:'Подземелье',risk:4,realm:'underground'},undercity:{name:'Подземный город',risk:1,realm:'underground',town:true},
  port:{name:'Порт',risk:0,town:true},sea:{name:'Море',risk:3},island:{name:'Остров',risk:2},desert:{name:'Пустыня',risk:2},mountain:{name:'Горы',risk:3},
  dream:{name:'Сновидение',risk:3,realm:'dream'},clockwork:{name:'Механический квартал',risk:3,realm:'clockwork'},citadel:{name:'Цитадель',risk:1,town:true}
};
export const CONTINENT_NAMES=['Срединная земля','Край Семи Приливов','Стеклянный материк','Красный берег','Земля невозвратившихся писем','Север без солнца','Южный предел','Архипелаг забытого завтра'];
export const LANDMARK_NAMES={
  road:['Соляной тракт','Дорога старого короля','Путь четырёх обещаний','Просёлок без указателей'],
  village:['Лисий Брод','Медная Заводь','Низкое Солнце','Два Колодца'],forest:['Лес растущих часов','Папоротниковая чаща','Чёрная роща','Сад беглых деревьев'],
  ruins:['Башня потерянной луны','Руины первой короны','Замок без входа','Обломки небесной гавани'],camp:['Стоянка пяти костров','Ночлег у кривой сосны','Привал вернувшихся','Пустой караванный двор'],
  cave:['Пещера поющих камней','Зев горы','Ход в чёрный известняк','Соляные тоннели'],dungeon:['Лабиринт трёх дверей','Тюрьма бессмертного короля','Подземелье стеклянных костей','Крипта непрожитых жизней'],
  undercity:['Нижний Брод','Город шахтёрских фонарей','Подземная республика','Семь слоёв тишины'],port:['Гавань солёного ветра','Причал сорока мачт','Порт Последняя Монета','Тихая бухта'],
  sea:['Серое море','Море шепчущих парусов','Залив тяжёлых обещаний','Открытые воды'],island:['Остров с одним деревом','Остров стеклянных птиц','Остров забытого маяка','Берег неспящих'],
  desert:['Пески утонувшего моря','Долина золотой пыли','Пустыня зеркальных колодцев','Белый солончак'],mountain:['Перевал снеговых духов','Лестница великанов','Горная тропа','Седло каменного дракона'],
  dream:['Сон чужого детства','Площадь незаконченных мыслей','Рынок сновидений','Лес спящих звёзд'],clockwork:['Квартал вечных механизмов','Завод непрошедших часов','Медная машина','Станция обратного хода'],
  citadel:['Цитадель последней печати','Замок Двенадцать Клятв','Столица без короля','Дворец мелкого шрифта']
};
export const ROUTE_NAMES={road:'Тропа',sea:'Морской путь',stairs:'Спуск',portal:'Портал',time:'Разлом эпох',door:'Дверь',lift:'Подъёмник'};
