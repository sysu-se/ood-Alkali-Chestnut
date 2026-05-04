import { Sudoku } from "./sudoku.js";

export class Game {
  constructor({ sudoku }) {
    // 当前数独盘面
    this._currentSudoku = sudoku.clone();
    // 主历史：只存 JSON 快照
    this._history = [this._currentSudoku.toJSON()];
    // 主历史指针
    this._historyIndex = 0;

    // Explore 状态
    this._exploring = false;
    this._exploreSnapshot = null;
    this._exploreHistory = null;
    this._exploreHistoryIndex = 0;
    this._failedExploreStates = new Set();
    this._exploreFirstMove = null;
    this._failedFirstMoves = new Set();
  }

  // 获取当前盘面（副本）
  getSudoku() {
    return this._currentSudoku.clone();
  }

  isExploring() {
    return this._exploring;
  }

  // 内部：当前使用哪条历史
  _getActiveHistory() {
    return this._exploring ? this._exploreHistory : this._history;
  }

  _getActiveHistoryIndex() {
    return this._exploring ? this._exploreHistoryIndex : this._historyIndex;
  }

  _setActiveHistory(history, index) {
    if (this._exploring) {
      this._exploreHistory = history;
      this._exploreHistoryIndex = index;
    } else {
      this._history = history;
      this._historyIndex = index;
    }
  }

  // 能否撤销(晚于初始态)
  canUndo() {
    return this._getActiveHistoryIndex() > 0;
  }

  // 能否重做(先于最新态)
  canRedo() {
    const history = this._getActiveHistory();
    return this._getActiveHistoryIndex() < history.length - 1;
  }

  // 填数字（只在真正变化时记录历史）
  guess(move) {
    const result = this._currentSudoku.guess(move);

    if (result.success && result.changed) {
      let history = this._getActiveHistory();
      let index = this._getActiveHistoryIndex();

      history = history.slice(0, index + 1);
      history.push(this._currentSudoku.toJSON());
      index++;

      this._setActiveHistory(history, index);

      if (this._exploring && !this._exploreFirstMove) {
        this._exploreFirstMove = { ...move };
      }
    }

    if (this._exploring) {
      if (this._isExploreDeadEnd()) {
        this._markExploreFailed();
      }
    }
    return result;
  }

  getCandidates(row, col) {
    return this._currentSudoku.getCandidates(row, col);
  }

  getExploreFirstMove() {
    return this._exploreFirstMove ? { ...this._exploreFirstMove } : null;
  }

  _getFirstMoveKey(move) {
    return `${move.row},${move.col},${move.value}`;
  }

  // 撤销
  undo() {
    if (!this.canUndo()) return;
    const history = this._getActiveHistory();
    let index = this._getActiveHistoryIndex();
    index--;
    this._setActiveHistory(history, index);
    this._restoreFromHistory();
  }

  // 重做
  redo() {
    if (!this.canRedo()) return;
    const history = this._getActiveHistory();
    let index = this._getActiveHistoryIndex();
    index++;
    this._setActiveHistory(history, index);
    this._restoreFromHistory();
  }

  // 从历史恢复当前盘面
  _restoreFromHistory() {
    const history = this._getActiveHistory();
    const index = this._getActiveHistoryIndex();
    const json = history[index];
    this._currentSudoku = Sudoku.fromJSON(json);
  }

  // === Explore Mode ===
  enterExplore() {
    if (this._exploring) return;
    this._exploreFirstMove = null;

    this._exploring = true;
    this._exploreSnapshot = this._currentSudoku.clone();
    this._exploreHistory = [this._currentSudoku.toJSON()];
    this._exploreHistoryIndex = 0;
  }

  commitExplore() {
    if (!this._exploring) return;

    const snapshotGrid = this._exploreSnapshot?.toJSON()?.grid;
    const currentGrid = this._currentSudoku.toJSON().grid;
    const changed = JSON.stringify(snapshotGrid) !== JSON.stringify(currentGrid);

    // 回到主线
    this._exploring = false;
    this._exploreSnapshot = null;
    this._exploreHistory = null;
    this._exploreHistoryIndex = 0;
    this._exploreFirstMove = null;

    if (changed) {
      this._history = this._history.slice(0, this._historyIndex + 1);
      this._history.push(this._currentSudoku.toJSON());
      this._historyIndex++;
    }
  }

  cancelExplore() {
    if (!this._exploring) return;

    this._currentSudoku = this._exploreSnapshot.clone();
    this._exploring = false;
    this._exploreSnapshot = null;
    this._exploreHistory = null;
    this._exploreHistoryIndex = 0;
    this._exploreFirstMove = null;
  }

  // === Explore Failure Memory ===
  _isExploreDeadEnd() {
    const grid = this._currentSudoku.getGrid();
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          const cand = this._currentSudoku.getCandidates(row, col);
          if (cand.length === 0) {
            return true;
          }
        }
      }
    }
    return false;
  }

  _getExploreStateKey() {
    const grid = this._currentSudoku.toJSON().grid;
    return JSON.stringify(grid);
  }

  isFailedExploreState() {
    return this._failedExploreStates.has(this._getExploreStateKey());
  }

  _markExploreFailed() {
    this._failedExploreStates.add(this._getExploreStateKey());
    if (this._exploreFirstMove) {
      this._failedFirstMoves.add(this._getFirstMoveKey(this._exploreFirstMove));
    }
  }

  isFailedFirstMove(move) {
    return this._failedFirstMoves.has(this._getFirstMoveKey(move));
  }

  // 序列化
  toJSON() {
    return {
      history: this._history,
      index: this._historyIndex,
      exploring: this._exploring,
      exploreSnapshot: this._exploreSnapshot ? this._exploreSnapshot.toJSON() : null,
      exploreHistory: this._exploreHistory,
      exploreIndex: this._exploreHistoryIndex,
      failedExploreStates: Array.from(this._failedExploreStates),
      exploreFirstMove: this._exploreFirstMove,
      failedFirstMoves: Array.from(this._failedFirstMoves)
    };
  }

  static fromJSON(json) {
    const firstSudoku = Sudoku.fromJSON(json.history[0]);
    const game = new Game({ sudoku: firstSudoku });

    game._history = json.history;
    game._historyIndex = json.index;

    game._exploring = json.exploring || false;
    game._exploreSnapshot = json.exploreSnapshot ? Sudoku.fromJSON(json.exploreSnapshot) : null;
    game._exploreHistory = json.exploreHistory || null;
    game._exploreHistoryIndex = json.exploreIndex ?? 0;
    game._failedExploreStates = new Set(json.failedExploreStates || []);
    game._exploreFirstMove = json.exploreFirstMove || null;
    game._failedFirstMoves = new Set(json.failedFirstMoves || []);

    if (game._exploring && game._exploreHistory) {
      game._currentSudoku = Sudoku.fromJSON(game._exploreHistory[game._exploreHistoryIndex]);
    } else {
      game._restoreFromHistory();
    }

    return game;
  }

  // 外表化
  toString() {
    return `
=== Game State ===
Step: ${this._historyIndex + 1} / ${this._history.length}
Can Undo: ${this.canUndo()}
Can Redo: ${this.canRedo()}

Current Board:
${this._currentSudoku.toString()}
    `;
  }
}