import type { ImageSourcePropType } from 'react-native';

import type { StormLegend } from './legends';

/**
 * Photographs for the storm legends.
 *
 * Generated from `assets/legends/manifest.json`. Every file was pulled from
 * Wikimedia Commons and its licence read from the API rather than assumed:
 * only public domain, CC0, CC BY and CC BY-SA files were kept, and the
 * attribution below is what the licence requires in return.
 *
 * `caption` is what the photograph actually shows, which is deliberately not
 * always the legend it sits under. Freely licensed photography of a specific
 * storm from 1925 or of a village in the Congo mostly does not exist, so some
 * entries illustrate the phenomenon rather than document the event. Printing
 * the real caption under the image is what keeps that honest, and a legend
 * with no acceptable image simply keeps its icon.
 *
 * Bundled rather than fetched: the lore screens are the one part of the app
 * that never touches the network, and that should stay true on a plane.
 */
export interface LegendImage {
  source: ImageSourcePropType;
  /** What the photograph shows, in its own words. */
  caption: string;
  /** Photographer or institution, as the licence requires. */
  credit: string;
  license: string;
  licenseUrl: string;
  /** The Commons file page, so the claim can be checked. */
  sourceUrl: string;
}

export const LEGEND_IMAGES: Partial<Record<StormLegend['id'], LegendImage>> = {
  'bogor': {
    source: require('../../../../assets/legends/bogor.jpg'),
    caption: 'Crepuscular Rays and Cumulonimbus Clouds',
    credit: 'Astronaut photograph ISS069-E-88621 was acquired on September 16, 2023, with a Nikon D5...',
    license: 'Public domain',
    licenseUrl: '',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Crepuscular_Rays_and_Cumulonimbus_Clouds_(153537).jpg',
  },
  'bridge-creek': {
    source: require('../../../../assets/legends/bridge-creek.jpg'),
    caption: '1999 Bridge Creek-Moore tornado radar KTLX 1999-05-03',
    credit: 'National Weather Service (NWS), Federal Aviation Administration (FAA), and United State...',
    license: 'Public domain',
    licenseUrl: '',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:1999_Bridge_Creek-Moore_tornado_radar_KTLX_1999-05-03.jpg',
  },
  'burketown': {
    source: require('../../../../assets/legends/burketown.jpg'),
    caption: 'Beautiful morning glory',
    credit: 'Queen of Dubai',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Beautiful_morning_glory.jpg',
  },
  'catatumbo': {
    source: require('../../../../assets/legends/catatumbo.jpg'),
    caption: 'Catatumbo Lightning- Rayo del Catatumbo',
    credit: 'Fernando Flores from Caracas, Venezuela',
    license: 'CC BY-SA 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Catatumbo_Lightning-_Rayo_del_Catatumbo_(28034999754).jpg',
  },
  'cordoba': {
    source: require('../../../../assets/legends/cordoba.jpg'),
    caption: 'Granizo en Octubre 08',
    credit: 'Gastón Cuello',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Granizo_en_Octubre_08.JPG',
  },
  'daulatpur-saturia': {
    source: require('../../../../assets/legends/daulatpur-saturia.jpg'),
    caption: '2008 Tornado Damage to Westin Peachtree Plaza Hotel',
    credit: 'Brianga (talk)',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'http://creativecommons.org/licenses/by-sa/3.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:2008_Tornado_Damage_to_Westin_Peachtree_Plaza_Hotel.jpg',
  },
  'el-reno': {
    source: require('../../../../assets/legends/el-reno.jpg'),
    caption: '2011 El Reno–Piedmont tornado NWS map',
    credit: 'National Weather Service',
    license: 'Public domain',
    licenseUrl: '',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:2011_El_Reno%E2%80%93Piedmont_tornado_NWS_map.jpg',
  },
  'gopalganj-hail': {
    source: require('../../../../assets/legends/gopalganj-hail.jpg'),
    caption: 'A field of hailstones',
    credit: 'Nerdybeng at English Wikipedia',
    license: 'Public domain',
    licenseUrl: '',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:A_field_of_hailstones.jpg',
  },
  'hector': {
    source: require('../../../../assets/legends/hector.jpg'),
    caption: 'HectorCloud',
    credit: 'Djambalawa',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:HectorCloud.jpg',
  },
  'hokuriku': {
    source: require('../../../../assets/legends/hokuriku.jpg'),
    caption: 'Lake Effect Produced Thundersnow on Lake Onatrio and Lake Erie',
    credit: 'GOES imagery: CSU/CIRA & NOAA',
    license: 'Public domain',
    licenseUrl: '',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lake_Effect_Produced_Thundersnow_on_Lake_Onatrio_and_Lake_Erie_(CIRA_2022-11-17).png',
  },
  'iowa-derecho': {
    source: require('../../../../assets/legends/iowa-derecho.jpg'),
    caption: '2020-Aug-14 Moundview Neighborhood Cedar Rapids IA Muller IowaWatch',
    credit: 'Lyle Muller',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:2020-Aug-14_Moundview_Neighborhood_Cedar_Rapids_IA_Muller_IowaWatch.jpg',
  },
  'kampala': {
    source: require('../../../../assets/legends/kampala.jpg'),
    caption: 'Big Lightning Strike',
    credit: 'Sunilvirus',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Big_Lightning_Strike.jpg',
  },
  'khartoum': {
    source: require('../../../../assets/legends/khartoum.jpg'),
    caption: 'Dust storm over Sudan and the Red Sea',
    credit: 'Jeff Schmaltz, MODIS Land Rapid Response Team, NASA GSFC',
    license: 'Public domain',
    licenseUrl: '',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Dust_storm_over_Sudan_and_the_Red_Sea_(MODIS_2017-06-26).jpg',
  },
  'lake-victoria': {
    source: require('../../../../assets/legends/lake-victoria.jpg'),
    caption: 'Fog Rolls Out From Storm Over Lake Michigan',
    credit: 'GOES imagery: CSU/CIRA & NOAA',
    license: 'Public domain',
    licenseUrl: '',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Fog_Rolls_Out_From_Storm_Over_Lake_Michigan_(CIRA_2025-05-15).png',
  },
  'mawsynram': {
    source: require('../../../../assets/legends/mawsynram.jpg'),
    caption: 'NohKaLikai Falls V2 Wiki',
    credit: 'Vikramjit Kakati',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:NohKaLikai_Falls_V2_Wiki.jpg',
  },
  'phoenix': {
    source: require('../../../../assets/legends/phoenix.jpg'),
    caption: 'Haboob, Ahwatukee',
    credit: 'John Jurik (Junebug172 at en.wikipedia)',
    license: 'Public domain',
    licenseUrl: '',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Haboob,_Ahwatukee.jpg',
  },
  'sumatra-squall': {
    source: require('../../../../assets/legends/sumatra-squall.jpg'),
    caption: 'Arcus 28 July 2021 Galley Common 01',
    credit: 'Rubbish computer',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Arcus_28_July_2021_Galley_Common_01.jpg',
  },
  'super-outbreak': {
    source: require('../../../../assets/legends/super-outbreak.jpg'),
    caption: '1974 Super Outbreak Fujita color map',
    credit: 'Tetsuya Theodore "Ted" Fujita (1920-1998)',
    license: 'Public domain',
    licenseUrl: '',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:1974_Super_Outbreak_Fujita_color_map.jpg',
  },
  'tampa': {
    source: require('../../../../assets/legends/tampa.jpg'),
    caption: '3 Near-Simultaneous Lightning Strikes on One Exposure',
    credit: 'Rollingskyphoto',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:3_Near-Simultaneous_Lightning_Strikes_on_One_Exposure.jpg',
  },
  'tri-state': {
    source: require('../../../../assets/legends/tri-state.jpg'),
    caption: 'Tri-State State Tornado Damage Longfellow School 2',
    credit: 'Unknown',
    license: 'Public domain',
    licenseUrl: '',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Tri-State_State_Tornado_Damage_Longfellow_School_2.jpg',
  },
  'vivian-hail': {
    source: require('../../../../assets/legends/vivian-hail.jpg'),
    caption: 'Record hailstone Vivian, SD',
    credit: 'NWS Aberdeen, SD',
    license: 'Public domain',
    licenseUrl: '',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Record_hailstone_Vivian,_SD.jpg',
  },
};

/** The photograph for a legend, or undefined when it keeps its icon. */
export function legendImage(id: StormLegend['id']): LegendImage | undefined {
  return LEGEND_IMAGES[id];
}
