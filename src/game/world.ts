import { allFakers, faker, fakerNB_NO } from "@faker-js/faker";
import { fakerAR, fakerCS_CZ, fakerEN_US, fakerEN_GB, fakerEN_IN, fakerTR, fakerJA, fakerPL, fakerES_MX, fakerHE, fakerZH_CN, fakerEL, Faker } from '@faker-js/faker';
import { City } from "./types";

export const CITIES : City[] = [
  { id: 'prague', name: 'Prague', flavor: 'alchemical history, astronomical mysteries', faker: fakerCS_CZ },
  { id: 'alexandria', name: 'Alexandria', flavor: 'ancient libraries, lost knowledge', faker: fakerAR, needs_transliteration: true },
  { id: 'salem', name: 'Salem, MA', flavor: 'witch trials, puritan secrets', faker: fakerEN_US },
  { id: 'istanbul', name: 'Istanbul', flavor: 'crossroads of empires, layered histories', faker: fakerTR },
  { id: 'new-orleans', name: 'New Orleans', flavor: 'voodoo, jazz, swamp mysteries', faker: fakerEN_US },
  { id: 'kyoto', name: 'Kyoto', flavor: 'temples, shrines, ritual traditions', faker: fakerJA, needs_transliteration: true },
  { id: 'edinburgh', name: 'Edinburgh', flavor: 'underground vaults, enlightenment darkness', faker: fakerEN_GB },
  { id: 'marrakech', name: 'Marrakech', flavor: 'souks, desert mysticism', faker: fakerAR, needs_transliteration: true },
  { id: 'reykjavik', name: 'Reykjavik', flavor: 'sagas, volcanic landscapes', faker: fakerNB_NO },
  { id: 'varanasi', name: 'Varanasi', flavor: 'death rituals, river ghats', faker: fakerEN_IN },
  { id: 'cairo', name: 'Cairo', flavor: 'pyramids, desert tombs', faker: fakerAR, needs_transliteration: true },
  { id: 'san-francisco', name: 'San Francisco', flavor: 'counterculture, tech occultism', faker: fakerEN_US },
  { id: 'krakow', name: 'Kraków', flavor: 'medieval alchemy, salt mines', faker: fakerPL },
  { id: 'mexico-city', name: 'Mexico City', flavor: 'Aztec ruins beneath modernity', faker: fakerES_MX },
  { id: 'jerusalem', name: 'Jerusalem', flavor: 'three faiths, ancient stones', faker: fakerHE, needs_transliteration: true },
  { id: 'london', name: 'London', flavor: 'Victorian occultism, foggy secrets', faker: fakerEN_GB },
  { id: 'shanghai', name: 'Shanghai', flavor: 'colonial decay, modern excess', faker: fakerZH_CN, needs_transliteration: true },
  { id: 'sedona', name: 'Sedona, AZ', flavor: 'vortexes, new age seekers', faker: fakerEN_US },
  { id: 'athens', name: 'Athens', flavor: 'philosophical ruins, oracle sites', faker: fakerEL, needs_transliteration: true },
  { id: 'santa-fe', name: 'Santa Fe', flavor: 'desert spirituality, art colonies', faker: fakerES_MX }
];

export function getCityById(cityId: string) : City | undefined {
  return CITIES.find(city => city.id === cityId);
}

// ── Named venues per city ──────────────────────────────────────────────────

export interface CityVenues {
  /** The specific archive, library, or collection to research in */
  library: string;
  /** The specific cemetery, ruin, or historic site to explore */
  site: string;
  /** The specific café, tea house, or bar to network in */
  cafe: string;
  /** The specific gallery, theatre, or performance space to attend */
  culturalVenue: string;
}

export const CITY_VENUES: Record<string, CityVenues> = {
  prague: {
    library:       'the Klementinum',
    site:          'the Old Jewish Cemetery in Josefov',
    cafe:          'Café Louvre on Národní',
    culturalVenue: 'the Municipal House concert hall',
  },
  alexandria: {
    library:       'the Bibliotheca Alexandrina',
    site:          'the Catacombs of Kom el Shoqafa',
    cafe:          'Trianon Patisserie on El Horreya',
    culturalVenue: 'the ruins of the Serapeum',
  },
  salem: {
    library:       'the Phillips Library at Peabody Essex',
    site:          'Charter Street Cemetery',
    cafe:          "Turner's Seafood gathering hall",
    culturalVenue: 'the Witch Trials Memorial',
  },
  istanbul: {
    library:       'the Süleymaniye Manuscript Library',
    site:          'the Theodosian Walls at Yedikule',
    cafe:          'Pierre Loti Café on the Golden Horn',
    culturalVenue: "the Grand Bazaar's hans and lodges",
  },
  'new-orleans': {
    library:       "Tulane's Howard-Tilton Library",
    site:          'St. Louis Cemetery No. 1',
    cafe:          'Café Du Monde under the arcade',
    culturalVenue: 'Preservation Hall on St. Peter',
  },
  kyoto: {
    library:       "the Kyoto University Library's rare books room",
    site:          "Fushimi Inari-taisha's inner sanctum",
    cafe:          'Ippodo Tea House on Teramachi',
    culturalVenue: 'the Gion Festival float warehouses',
  },
  edinburgh: {
    library:       "the National Library of Scotland's map room",
    site:          'Greyfriars Kirkyard',
    cafe:          'The Elephant House on George IV Bridge',
    culturalVenue: 'the Edinburgh Vaults beneath South Bridge',
  },
  marrakech: {
    library:       'the Ben Youssef Madrasa library',
    site:          'the Saadian Tombs in the Kasbah',
    cafe:          'Café de France on the Djemaa el-Fna',
    culturalVenue: 'the Dar Bellarj Foundation',
  },
  reykjavik: {
    library:       'the Árni Magnússon Institute for Icelandic Studies',
    site:          'the lava fields at Þingvellir',
    cafe:          'Mokka Kaffi on Skólavörðustígur',
    culturalVenue: "the National Museum's sorcery collection",
  },
  varanasi: {
    library:       "Sampurnanand Sanskrit University's manuscript collection",
    site:          'Manikarnika Ghat at cremation hour',
    cafe:          'the rooftop chai stalls near Dasaswamedh',
    culturalVenue: 'Bharat Kala Bhavan gallery',
  },
  cairo: {
    library:       "Dar El Kotob's rare manuscripts wing",
    site:          'the Necropolis of the City of the Dead',
    cafe:          "Fishawi's coffeehouse in Khan el-Khalili",
    culturalVenue: "the Egyptian Museum's unmapped back rooms",
  },
  'san-francisco': {
    library:       "the San Francisco Public Library's history center",
    site:          'the Columbarium in the Richmond District',
    cafe:          'City Lights Bookstore on Columbus',
    culturalVenue: "the Mechanics' Institute reading room",
  },
  krakow: {
    library:       'the Jagiellonian University Library',
    site:          "the Wawel Dragon's Den beneath the hill",
    cafe:          'Camelot Café in Kazimierz',
    culturalVenue: 'the Wieliczka Salt Mine chapel',
  },
  'mexico-city': {
    library:       'the Biblioteca Nacional within the Ciudadela',
    site:          "Teotihuacan's Avenue of the Dead",
    cafe:          'La Casa de las Sirenas beneath the ruins',
    culturalVenue: "the Museo Nacional de Antropología's restricted vaults",
  },
  jerusalem: {
    library:       "the National Library of Israel's manuscript room",
    site:          'the Church of the Holy Sepulchre at dawn',
    cafe:          'a rooftop café on the Via Dolorosa',
    culturalVenue: "the Rockefeller Museum's unlabelled storerooms",
  },
  london: {
    library:       "the British Library's rare manuscripts room",
    site:          "Kensal Green Cemetery's catacombs",
    cafe:          'the Atlantis Bookshop on Museum Street',
    culturalVenue: "Dennis Severs' House on Folgate Street",
  },
  shanghai: {
    library:       "the Shanghai Library's historical archives",
    site:          'the Yu Garden lanes in the Old Town',
    cafe:          'a French Concession teahouse on Yongkang Lu',
    culturalVenue: 'the Propaganda Poster Art Centre',
  },
  sedona: {
    library:       "the Sedona Public Library's southwest collection",
    site:          'the Palatki Heritage Site ruins',
    cafe:          'Coffee Pot Restaurant at dawn',
    culturalVenue: 'the Tlaquepaque Arts Village',
  },
  athens: {
    library:       "the Gennadius Library's occult holdings",
    site:          'the Kerameikos cemetery at the Dipylon Gate',
    cafe:          'Café Neon on Omonia Square',
    culturalVenue: "the National Archaeological Museum's storage wing",
  },
  'santa-fe': {
    library:       "the New Mexico State Library's territorial archives",
    site:          'the Puyé Cliff Dwellings',
    cafe:          'The Shed on Palace Avenue',
    culturalVenue: 'the Museum of International Folk Art',
  },
};
