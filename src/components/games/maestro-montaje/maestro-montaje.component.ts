import { ChangeDetectionStrategy, Component, computed, signal, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProgressService } from '../../../services/progress.service';

type GameState = 'start' | 'playing' | 'finished';
type PlayState = 'layout' | 'components' | 'wiring';

interface Draggable {
  id: string;
  name: string;
  type: 'duct' | 'rail' | 'component' | 'wire';
  placed: boolean;
  position?: { x: number; y: number };
  width: number;
  height: number;
}

interface Wire {
  id: string;
  from: string; // terminal ID
  to: string; // terminal ID
  isNeat: boolean; // routed through ducts
}

@Component({
  selector: 'app-maestro-montaje',
  templateUrl: './maestro-montaje.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class MaestroMontajeComponent {
  gameState = signal<GameState>('start');
  playState = signal<PlayState>('layout');
  
  // Game elements
  inventoryMaster = signal<Draggable[]>([
    { id: 'duct-top', name: 'Canaleta Superior', type: 'duct', placed: false, width: 300, height: 40 },
    { id: 'rail1', name: 'Carril DIN 1', type: 'rail', placed: false, width: 300, height: 20 },
    { id: 'duct-mid', name: 'Canaleta Central', type: 'duct', placed: false, width: 300, height: 40 },
    { id: 'rail2', name: 'Carril DIN 2', type: 'rail', placed: false, width: 300, height: 20 },
    { id: 'q1', name: 'Disyuntor Q1', type: 'component', placed: false, width: 50, height: 60 },
    { id: 'km1', name: 'Contactor KM1', type: 'component', placed: false, width: 50, height: 60 },
    { id: 'f1', name: 'Relé Térmico F1', type: 'component', placed: false, width: 50, height: 60 },
  ]);
  inventory = signal<Draggable[]>([]);
  
  placedItems = signal<Draggable[]>([]);
  wires = signal<Wire[]>([]);
  
  cleanliness = signal(100);
  isWiringCorrect = signal(false);
  finalScore = signal(0);
  feedbackMessage = signal('');

  // Computed state
  layoutPlaced = computed(() => this.placedItems().filter(item => item.type === 'duct' || item.type === 'rail').length === 4);
  componentsPlaced = computed(() => this.placedItems().filter(item => item.type === 'component').length === 3);

  constructor(private progressService: ProgressService) {
    effect(() => {
        if (this.layoutPlaced()) {
            setTimeout(() => this.playState.set('components'), 500);
        }
        if (this.componentsPlaced()) {
            setTimeout(() => this.playState.set('wiring'), 500);
        }
    });
  }

  startGame() {
    this.gameState.set('playing');
    this.playState.set('layout');
    // Deep copy to reset state
    this.inventory.set(JSON.parse(JSON.stringify(this.inventoryMaster())));
    this.placedItems.set([]);
    this.wires.set([]);
    this.cleanliness.set(100);
    this.isWiringCorrect.set(false);
  }
  
  placeItem(item: Draggable) {
    if (item.placed) return;

    // Simplified placement logic
    const targetState = item.type === 'duct' || item.type === 'rail' ? 'layout' : 'components';
    if (this.playState() !== targetState) return;

    this.inventory.update(inv => 
      inv.map(i => i.id === item.id ? { ...i, placed: true } : i)
    );
    this.placedItems.update(items => [...items, item]);
  }

  // This is a simplified simulation of wiring for the game
  addWire(isNeat: boolean) {
      if (this.playState() !== 'wiring') return;
      
      const id = `wire-${this.wires().length + 1}`;
      this.wires.update(w => [...w, { id, from: 'a', to: 'b', isNeat }]);

      if(!isNeat) {
          this.cleanliness.update(c => Math.max(0, c - 15));
      }
  }

  checkWork() {
    // Simplified validation
    const hasMessyWires = this.wires().some(w => !w.isNeat);
    this.isWiringCorrect.set(this.wires().length > 5 && this.componentsPlaced()); // At least 6 wires and all components
    
    const cleanlinessScore = this.cleanliness();
    const correctnessScore = this.isWiringCorrect() ? 100 : 0;
    
    const calculatedScore = Math.round((correctnessScore * 0.7) + (cleanlinessScore * 0.3));
    this.finalScore.set(calculatedScore);
    
    this.progressService.completeGame(calculatedScore, 100);

    if (!this.isWiringCorrect()) {
        this.feedbackMessage.set('¡Asere, te faltan cables o componentes! Revisa el esquema, que algo no está bien conectado.');
    } else if (hasMessyWires) {
        this.feedbackMessage.set('Funciona, pero ¡qué chapucería! Usa las canaletas, que para eso están. La limpieza es clave.');
    } else {
        this.feedbackMessage.set('¡Fino filipino! Trabajo de maestro. Limpio, ordenado y funcionando. ¡Estás listo pa\'l examen!');
    }

    this.gameState.set('finished');
  }

  restartGame() {
    this.startGame();
  }
}
