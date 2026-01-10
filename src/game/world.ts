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
