import potholePhoto from '../assets/images/road_pothole_hazard_1791204696550.jpg';
import obstaclePhoto from '../assets/images/road_obstacle_hazard_1791204716004.jpg';
import damagePhoto from '../assets/images/road_damage_hazard_1791204740507.jpg';
import clearPhoto from '../assets/images/road_clear_highway_1791204776863.jpg';
import pedestrianPhoto from '../assets/images/road_pedestrian_hazard_1791205510461.jpg';
import cowPhoto from '../assets/images/road_cow_animal_hazard_1791205526469.jpg';
import dogPhoto from '../assets/images/road_dog_animal_hazard_1791205544698.jpg';
import { HazardCategory } from '../types';

export interface SampleRoadImage {
  id: string;
  title: string;
  category: HazardCategory;
  description: string;
  expectedRisk: 'HIGH' | 'MEDIUM' | 'LOW';
  dataUrl: string;
}

export const SAMPLE_ROAD_IMAGES: SampleRoadImage[] = [
  {
    id: 'sample-pedestrian',
    title: 'Pedestrian on Roadway',
    category: 'human',
    description: 'Pedestrian person crossing or stepping into vehicular traffic lane.',
    expectedRisk: 'HIGH',
    dataUrl: pedestrianPhoto,
  },
  {
    id: 'sample-cow',
    title: 'Stray Cattle / Cow on Road',
    category: 'animal',
    description: 'Large cow standing stationary in active asphalt vehicular lane.',
    expectedRisk: 'HIGH',
    dataUrl: cowPhoto,
  },
  {
    id: 'sample-dog',
    title: 'Stray Dog Crossing Street',
    category: 'animal',
    description: 'Stray dog moving quickly across roadway carriageway.',
    expectedRisk: 'MEDIUM',
    dataUrl: dogPhoto,
  },
  {
    id: 'sample-pothole',
    title: 'Deep Asphalt Pothole',
    category: 'pothole',
    description: 'Severe pothole crater on vehicular wheel track with sharp broken edges and exposed aggregate.',
    expectedRisk: 'HIGH',
    dataUrl: potholePhoto,
  },
  {
    id: 'sample-obstacle',
    title: 'Roadway Obstacle & Debris',
    category: 'obstacle',
    description: 'Large fallen tree branch and road obstacle blocking active travel lane.',
    expectedRisk: 'HIGH',
    dataUrl: obstaclePhoto,
  },
  {
    id: 'sample-damage',
    title: 'Damaged & Cracked Pavement',
    category: 'road_damage',
    description: 'Extensive alligator cracking, asphalt depression, and surface fragmentation.',
    expectedRisk: 'MEDIUM',
    dataUrl: damagePhoto,
  },
  {
    id: 'sample-clear',
    title: 'Clear Highway Carriageway',
    category: 'clear',
    description: 'Dry, well-marked asphalt roadway with optimal visibility and clear driving lane.',
    expectedRisk: 'LOW',
    dataUrl: clearPhoto,
  },
];
