
import type { Voice } from './types';

export const SUPPORTED_LANG_CODES = ['default', 'ar', 'en', 'es', 'fr'];

export interface MusicTrack {
    id: string;
    name: string;
    url: string;
    category: string;
}

export const BACKGROUND_MUSIC: MusicTrack[] = [
    { id: 'none', name: 'No Background Music', url: '', category: 'None' },
    { id: 'arabic_mood', name: 'Arabic Mood (Oud)', url: 'https://cdn.pixabay.com/audio/2023/06/15/audio_24564c7a52.mp3', category: 'Eastern' },
    { id: 'desert_night', name: 'Desert Night', url: 'https://cdn.pixabay.com/audio/2022/10/25/audio_511c15278c.mp3', category: 'Eastern' },
    { id: 'romantic_piano', name: 'Romantic Piano', url: 'https://cdn.pixabay.com/audio/2022/11/22/audio_febc508520.mp3', category: 'Romantic' }
];

export const AVAILABLE_VOICES: Voice[] = [
  {
    id: 'rami_bold',
    name: 'Rami',
    nameTranslations: { ar: 'رامي (دراما)', en: 'Rami (Acting)', es: 'Rami', fr: 'Rami' },
    gender: 'male',
    style: 'Dramatic',
    styleTranslations: { ar: 'درامي', en: 'Dramatic', es: 'Dramático', fr: 'Dramatique' },
    apiName: 'Puck',
    language: 'Egyptian Arabic',
    greeting: 'أهلاً يا بطل! أنا رامي، جاهز لأي دور درامي.'
  },
  {
    id: 'ahmed_news',
    name: 'Ahmed',
    nameTranslations: { ar: 'أحمد (المذيع)', en: 'Ahmed (News)', es: 'Ahmed', fr: 'Ahmed' },
    gender: 'male',
    style: 'News',
    styleTranslations: { ar: 'إخباري', en: 'News', es: 'Noticias', fr: 'Infos' },
    apiName: 'Fenrir',
    language: 'Egyptian Arabic',
    greeting: 'مساء الخير، هنا القاهرة. معاكم أحمد في نشرة الأخبار.'
  },
  {
    id: 'karim_warm',
    name: 'Karim',
    nameTranslations: { ar: 'كريم (صديق)', en: 'Karim (Friendly)', es: 'Karim', fr: 'Karim' },
    gender: 'male',
    style: 'Friendly',
    styleTranslations: { ar: 'ودود', en: 'Friendly', es: 'Amistoso', fr: 'Amical' },
    apiName: 'Charon',
    language: 'Egyptian Arabic',
    greeting: 'يا صباح الفل يا صاحبي! عامل إيه النهاردة؟'
  },
  {
    id: 'maged_wise',
    name: 'Maged',
    nameTranslations: { ar: 'ماجد (حكيم)', en: 'Maged (Wise)', es: 'Maged', fr: 'Maged' },
    gender: 'male',
    style: 'Authoritative',
    styleTranslations: { ar: 'رزين', en: 'Wise', es: 'Sabio', fr: 'Sage' },
    apiName: 'Fenrir',
    language: 'Egyptian Arabic',
    greeting: 'السلام عليكم ورحمة الله، أنا ماجد.'
  },
  {
    id: 'hany_poet',
    name: 'Hany',
    nameTranslations: { ar: 'هاني (شاعر)', en: 'Hany (Poet)', es: 'Hany', fr: 'Hany' },
    gender: 'male',
    style: 'Poetic',
    styleTranslations: { ar: 'شاعري', en: 'Poetic', es: 'Poético', fr: 'Poétique' },
    apiName: 'Puck',
    language: 'Egyptian Arabic',
    greeting: 'يا مساء الجمال.. أنا هاني، صوت الكلمة الحلوة.'
  },
  {
    id: 'layla_soft',
    name: 'Layla',
    nameTranslations: { ar: 'ليلى (هادئ)', en: 'Layla (Soft)', es: 'Layla', fr: 'Layla' },
    gender: 'female',
    style: 'Calm',
    styleTranslations: { ar: 'هادئ', en: 'Soft', es: 'Suave', fr: 'Douce' },
    apiName: 'Kore',
    language: 'Egyptian Arabic',
    greeting: 'أهلاً بيك، أنا ليلى.. يومك جميل إن شاء الله.'
  },
  {
    id: 'rasha_story',
    name: 'Rasha',
    nameTranslations: { ar: 'رشا (حكواتية)', en: 'Rasha (Storyteller)', es: 'Rasha', fr: 'Rasha' },
    gender: 'female',
    style: 'Narrative',
    styleTranslations: { ar: 'سردي', en: 'Narrative', es: 'Narrativo', fr: 'Narratif' },
    apiName: 'Zephyr',
    language: 'Egyptian Arabic',
    greeting: 'تعال يا حبيبي احكيلك حكاية حلوة.'
  },
  {
    id: 'salma_promo',
    name: 'Salma',
    nameTranslations: { ar: 'سلمى (دعاية)', en: 'Salma (Promo)', es: 'Salma', fr: 'Salma' },
    gender: 'female',
    style: 'Persuasive',
    styleTranslations: { ar: 'إقناعي', en: 'Promo', es: 'Promocional', fr: 'Promo' },
    apiName: 'Kore',
    language: 'Egyptian Arabic',
    greeting: 'هاي! أنا سلمى، وعندي ليك عرض ما يتفوتش.'
  },
  {
    id: 'nour_singer',
    name: 'Nour',
    nameTranslations: { ar: 'نور (غناء)', en: 'Nour (Singer)', es: 'Nour', fr: 'Nour' },
    gender: 'female',
    style: 'Singing',
    styleTranslations: { ar: 'طربي', en: 'Singer', es: 'Cantante', fr: 'Chanteuse' },
    apiName: 'Zephyr',
    language: 'Egyptian Arabic',
    greeting: 'يا ليل يا عين.. أنا نور، تحب تسمع إيه؟'
  },
  {
    id: 'ziad_child',
    name: 'Ziad',
    nameTranslations: { ar: 'زياد (طفل)', en: 'Ziad (Child)', es: 'Ziad', fr: 'Ziad' },
    gender: 'child',
    style: 'Playful',
    styleTranslations: { ar: 'مرح', en: 'Playful Child', es: 'Niño', fr: 'Enfant' },
    apiName: 'Puck',
    language: 'Egyptian Arabic',
    greeting: 'أنا زياد! هنلعب إيه النهارده؟'
  },
  {
    id: 'zeina_child',
    name: 'Zeina',
    nameTranslations: { ar: 'زينة (طفلة)', en: 'Zeina (Child)', es: 'Zeina', fr: 'Zeina' },
    gender: 'child',
    style: 'Sweet',
    styleTranslations: { ar: 'رقيق', en: 'Sweet Child', es: 'Niña', fr: 'Enfant' },
    apiName: 'Zephyr',
    language: 'Egyptian Arabic',
    greeting: 'أهلاً، أنا زينة.. بحب القصص أوي.'
  }
];
