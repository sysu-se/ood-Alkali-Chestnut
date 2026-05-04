<script>
	import { onMount } from 'svelte';
	import { decodeSencode, validateSencode } from '@sudoku/sencode';
	// import game from '@sudoku/game';
	import { modal } from '@sudoku/stores/modal';
	// import { gameWon } from '@sudoku/stores/game';
	import Board from './components/Board/index.svelte';
	import Controls from './components/Controls/index.svelte';
	import Header from './components/Header/index.svelte';
	import Modal from './components/Modal/index.svelte';
	import { createGameStore } from './stores/gameStore.js';

	let gameStore;

	// gameStore.won.subscribe(won => {
	// 	if (won) {
	// 		modal.show('gameover');
	// 	}
	// });

	onMount(() => {
		let hash = location.hash;

		if (hash.startsWith('#')) {
			hash = hash.slice(1);
		}

		let sencode;
		if (validateSencode(hash)) {
			sencode = hash;
		}

		let initialGrid = [
			[5, 3, 0, 0, 7, 0, 0, 0, 0],
			[6, 0, 0, 1, 9, 5, 0, 0, 0],
			[0, 9, 8, 0, 0, 0, 0, 6, 0],
			[8, 0, 0, 0, 6, 0, 0, 0, 3],
			[4, 0, 0, 8, 0, 3, 0, 0, 1],
			[7, 0, 0, 0, 2, 0, 0, 0, 6],
			[0, 6, 0, 0, 0, 0, 2, 8, 0],
			[0, 0, 0, 4, 1, 9, 0, 0, 5],
			[0, 0, 0, 0, 8, 0, 0, 7, 9]
		];

		if (validateSencode(hash)) {
			sencode = hash;
			initialGrid = decodeSencode(hash);
		}

		modal.show('welcome', {
			onHide: () => {
				gameStore = createGameStore(initialGrid);

				gameStore.won.subscribe(won => {
					if (won) modal.show('gameover');
				});
			},
			sencode
		});
	});
</script>

<!-- Timer, Menu, etc. -->
<header>
	<Header />
</header>

<section>
{#if gameStore}
  <Board {gameStore} />
{/if}
</section>

<footer>
{#if gameStore}
  <Controls {gameStore} />
{/if}
</footer>

<Modal />

<style global>
	@import "./styles/global.css";
</style>