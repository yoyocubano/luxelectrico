import { ChangeDetectionStrategy, Component, computed, signal, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GAME_QUESTIONS, GameQuestion } from './questions';
import { ProgressService } from '../../../services/progress.service';

type GameState = 'start' | 'playing' | 'finished';

@Component({
  selector: 'app-voltaje-veloz',
  templateUrl: './voltaje-veloz.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class VoltajeVelozComponent implements OnDestroy {
  gameState = signal<GameState>('start');
  questions = signal<GameQuestion[]>([]);
  currentQuestionIndex = signal(0);
  score = signal(0);
  timeLeft = signal(15);
  selectedAnswer = signal<number | null>(null);
  
  private timerInterval: any;

  constructor(private progressService: ProgressService) {}

  // Derived state
  currentQuestion = computed(() => this.questions()[this.currentQuestionIndex()]);
  isAnswered = computed(() => this.selectedAnswer() !== null);
  isCorrect = computed(() => {
    if (!this.isAnswered()) return false;
    return this.selectedAnswer() === this.currentQuestion()?.correctAnswerIndex;
  });
  
  finalScoreMessage = computed(() => {
    const finalScore = this.score();
    if (finalScore === 10) return "¡Perfecto! Eres un maestro eléctrico.";
    if (finalScore >= 7) return "¡Muy bien! Tienes los cables bien puestos.";
    if (finalScore >= 5) return "¡Casi lo tienes! Un poco más de estudio y lo dominas.";
    return "¡Dale candela al estudio! Aún te falta un poco, pero tú puedes.";
  });

  ngOnDestroy() {
    this.clearTimer();
  }

  startGame() {
    this.questions.set(this.shuffleArray([...GAME_QUESTIONS]).slice(0, 10));
    this.currentQuestionIndex.set(0);
    this.score.set(0);
    this.gameState.set('playing');
    this.loadNextQuestion();
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  private loadNextQuestion() {
    this.clearTimer();
    this.selectedAnswer.set(null);

    if (this.currentQuestionIndex() >= this.questions().length) {
      this.endGame();
      return;
    }

    this.timeLeft.set(15);
    this.timerInterval = setInterval(() => {
      this.timeLeft.update(t => t - 1);
      if (this.timeLeft() <= 0) {
        this.handleTimeUp();
      }
    }, 1000);
  }

  selectAnswer(answerIndex: number) {
    if (this.isAnswered()) return;

    this.clearTimer();
    this.selectedAnswer.set(answerIndex);

    if (this.isCorrect()) {
      this.score.update(s => s + 1);
    }
    
    setTimeout(() => {
        this.currentQuestionIndex.update(i => i + 1);
        this.loadNextQuestion();
    }, 1500);
  }

  private handleTimeUp() {
    this.clearTimer();
    // Mark as answered with a non-existent index to show it as incorrect
    this.selectedAnswer.set(-1); 
    
    setTimeout(() => {
        this.currentQuestionIndex.update(i => i + 1);
        this.loadNextQuestion();
    }, 1500);
  }

  private clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private endGame() {
    this.gameState.set('finished');
    this.progressService.completeGame(this.score(), this.questions().length);
  }

  restartGame() {
    this.startGame();
  }
}
