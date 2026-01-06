import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProgressService } from '../../../services/progress.service';

type GameState = 'start' | 'playing' | 'finished';

interface Connection {
  from: string;
  to: string;
}

interface Terminal {
    id: string;
    x: number;
    y: number;
}

const REQUIRED_CONNECTIONS: Connection[] = [
    // Power Circuit
    { from: 'L1', to: 'Q1-1' }, { from: 'L2', to: 'Q1-3' }, { from: 'L3', to: 'Q1-5' },
    { from: 'Q1-2', to: 'KM1-1' }, { from: 'Q1-4', to: 'KM1-3' }, { from: 'Q1-6', to: 'KM1-5' },
    { from: 'Q1-2', to: 'KM2-1' }, { from: 'Q1-4', to: 'KM2-5' }, { from: 'Q1-6', to: 'KM2-3' }, // Inversion L2/L3 on KM2
    { from: 'KM1-2', to: 'KM2-2' }, { from: 'KM1-4', to: 'KM2-4' }, { from: 'KM1-6', to: 'KM2-6' },
    { from: 'KM2-2', to: 'F1-1' }, { from: 'KM2-4', to: 'F1-3' }, { from: 'KM2-6', to: 'F1-5' },
    // Control Circuit
    { from: 'L1-control', to: 'F1-95' },
    { from: 'F1-96', to: 'S1-1' },
    { from: 'S1-2', to: 'S2-3' }, { from: 'S1-2', to: 'S3-3' }, { from: 'S1-2', to: 'KM1-13' }, { from: 'S1-2', to: 'KM2-13' },
    { from: 'S2-4', to: 'KM2-21' }, // NC interlock
    { from: 'KM2-22', to: 'KM1-A1' },
    { from: 'S3-4', to: 'KM1-21' }, // NC interlock
    { from: 'KM1-22', to: 'KM2-A1' },
    { from: 'KM1-14', to: 'S2-4' },
    { from: 'KM2-14', to: 'S3-4' },
    { from: 'KM1-A2', to: 'N' },
    { from: 'KM2-A2', to: 'N' },
];

@Component({
  selector: 'app-cableado-maestro',
  templateUrl: './cableado-maestro.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class CableadoMaestroComponent {
  gameState = signal<GameState>('start');
  selectedTerminal = signal<Terminal | null>(null);
  userConnections = signal<Connection[]>([]);
  errorState = signal(false);
  
  // Expose helper and constant to the template
  public objectValues = Object.values;
  public readonly requiredConnectionsCount = REQUIRED_CONNECTIONS.length;

  constructor(private progressService: ProgressService) {}

  // Define terminals with their positions
  terminals: Record<string, Terminal> = {
    'L1': { id: 'L1', x: 40, y: 20 }, 'L2': { id: 'L2', x: 80, y: 20 }, 'L3': { id: 'L3', x: 120, y: 20 },
    'Q1-1': { id: 'Q1-1', x: 40, y: 80 }, 'Q1-3': { id: 'Q1-3', x: 80, y: 80 }, 'Q1-5': { id: 'Q1-5', x: 120, y: 80 },
    'Q1-2': { id: 'Q1-2', x: 40, y: 120 }, 'Q1-4': { id: 'Q1-4', x: 80, y: 120 }, 'Q1-6': { id: 'Q1-6', x: 120, y: 120 },
    
    'KM1-1': { id: 'KM1-1', x: 40, y: 160 }, 'KM1-3': { id: 'KM1-3', x: 80, y: 160 }, 'KM1-5': { id: 'KM1-5', x: 120, y: 160 },
    'KM1-2': { id: 'KM1-2', x: 40, y: 200 }, 'KM1-4': { id: 'KM1-4', x: 80, y: 200 }, 'KM1-6': { id: 'KM1-6', x: 120, y: 200 },
    'KM1-13': { id: 'KM1-13', x: 140, y: 160 }, 'KM1-14': { id: 'KM1-14', x: 140, y: 180 },
    'KM1-21': { id: 'KM1-21', x: 20, y: 160 }, 'KM1-22': { id: 'KM1-22', x: 20, y: 180 },
    'KM1-A1': { id: 'KM1-A1', x: 60, y: 210 }, 'KM1-A2': { id: 'KM1-A2', x: 100, y: 210 },

    'KM2-1': { id: 'KM2-1', x: 180, y: 160 }, 'KM2-3': { id: 'KM2-3', x: 220, y: 160 }, 'KM2-5': { id: 'KM2-5', x: 260, y: 160 },
    'KM2-2': { id: 'KM2-2', x: 180, y: 200 }, 'KM2-4': { id: 'KM2-4', x: 220, y: 200 }, 'KM2-6': { id: 'KM2-6', x: 260, y: 200 },
    'KM2-13': { id: 'KM2-13', x: 280, y: 160 }, 'KM2-14': { id: 'KM2-14', x: 280, y: 180 },
    'KM2-21': { id: 'KM2-21', x: 160, y: 160 }, 'KM2-22': { id: 'KM2-22', x: 160, y: 180 },
    'KM2-A1': { id: 'KM2-A1', x: 200, y: 210 }, 'KM2-A2': { id: 'KM2-A2', x: 240, y: 210 },
    
    'F1-1': { id: 'F1-1', x: 180, y: 240 }, 'F1-3': { id: 'F1-3', x: 220, y: 240 }, 'F1-5': { id: 'F1-5', x: 260, y: 240 },
    'F1-95': { id: 'F1-95', x: 400, y: 80 }, 'F1-96': { id: 'F1-96', x: 400, y: 100 },

    'L1-control': { id: 'L1-control', x: 380, y: 20 },
    'N': { id: 'N', x: 500, y: 20 },

    'S1-1': { id: 'S1-1', x: 400, y: 140 }, 'S1-2': { id: 'S1-2', x: 400, y: 160 },
    'S2-3': { id: 'S2-3', x: 380, y: 200 }, 'S2-4': { id: 'S2-4', x: 380, y: 220 },
    'S3-3': { id: 'S3-3', x: 420, y: 200 }, 'S3-4': { id: 'S3-4', x: 420, y: 220 },
  };

  progress = computed(() => (this.userConnections().length / this.requiredConnectionsCount) * 100);

  startGame() {
    this.gameState.set('playing');
    this.userConnections.set([]);
    this.selectedTerminal.set(null);
  }

  handleTerminalClick(terminalId: string) {
    if (this.gameState() !== 'playing') return;
    const clickedTerminal = this.terminals[terminalId];
    const startTerminal = this.selectedTerminal();

    if (!startTerminal) {
      this.selectedTerminal.set(clickedTerminal);
    } else {
      const isCorrect = this.isConnectionCorrect(startTerminal.id, clickedTerminal.id);
      const isDuplicate = this.isConnectionDuplicate(startTerminal.id, clickedTerminal.id);

      if (isCorrect && !isDuplicate) {
        this.userConnections.update(conns => [...conns, { from: startTerminal.id, to: clickedTerminal.id }]);
        if (this.userConnections().length === this.requiredConnectionsCount) {
            this.finishGame();
        }
      } else {
        this.triggerErrorState();
      }
      this.selectedTerminal.set(null);
    }
  }

  isConnectionCorrect(from: string, to: string): boolean {
    return REQUIRED_CONNECTIONS.some(conn =>
      (conn.from === from && conn.to === to) || (conn.from === to && conn.to === from)
    );
  }
  
  isConnectionDuplicate(from: string, to: string): boolean {
     return this.userConnections().some(conn =>
      (conn.from === from && conn.to === to) || (conn.from === to && conn.to === from)
    );
  }

  triggerErrorState() {
    this.errorState.set(true);
    setTimeout(() => this.errorState.set(false), 300);
  }

  finishGame() {
    this.progressService.completeGame(this.userConnections().length, this.requiredConnectionsCount);
    setTimeout(() => this.gameState.set('finished'), 500);
  }

  restartGame() {
    this.startGame();
  }
}
