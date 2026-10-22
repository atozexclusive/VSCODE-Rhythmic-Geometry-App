export const CELL_SEQUENCER_GUIDE = [
  {
    target: 'riff-cell-overview', title: 'Build a rhythm from small patterns',
    text: 'A cell is a short rhythm you can reuse. First build the patterns inside A and B, then arrange them into a phrase such as A → B → A.',
    notice: 'The selected cell is the one you edit. Changing A updates every A in your sequence.',
  },
  {
    target: 'riff-cell-library', title: 'Choose a cell to build',
    text: 'Tap A to select it. Use + to create B or another cell. Each cell keeps its own length, hits, accents, and color.',
    notice: 'Start with A. The dots preview its pattern. Use ••• to rename a cell; Random refreshes the cell patterns.',
  },
  {
    target: 'riff-cell-steps', title: 'Set the pattern length',
    text: 'Cell Steps is the number of positions in this cell’s pattern. For example, 7 steps gives A seven hit-or-rest positions before A starts again.',
    notice: 'Cell length is counted in steps. Section length is counted in bars. They do not have to line up evenly.',
  },
  {
    target: 'riff-cell-roll', title: 'Build the cell pattern',
    text: 'Tap steps to turn hits into rests or rests into hits. Hold a step to add an accent: a stronger hit. Try a few hits with space between them.',
    notice: 'Then select B and build a different pattern. A and B can have different numbers of steps.',
  },
  {
    target: 'riff-cell-order', title: 'Put the cells in order',
    text: 'Tap +A or +B to add that cell to the selected phrase. A → B → A plays all of A, then B, then A again, from left to right.',
    notice: '+ Phrase adds another group. Undo removes the selected phrase’s last slot; Clear Order clears that phrase.',
  },
  {
    target: 'riff-cell-phrase-repeats', title: '× repeats the whole phrase',
    text: 'The × number belongs to this phrase, not to one cell. For a phrase A → B, ×2 plays A → B → A → B before moving to the next phrase.',
    notice: '×1 plays the phrase once. With only one phrase, it already loops; repeats matter most when you add another phrase. The restart limit can still cut a phrase short.',
  },
  {
    target: 'riff-cell-global-mode', title: 'Global: restart after a set number of bars',
    text: 'Build your cell patterns and arrange them first. Global lets that order keep playing until the Section Bars limit, then starts again from the first cell.',
    notice: 'With Chain off, 4 bars means “restart the whole sequence every 4 bars.” It does not stretch the cells to fit: the last cell may be cut short.',
  },
  {
    target: 'riff-cell-per-cell-mode', title: 'Per Cell: give each slot its own length',
    text: 'Per Cell lets you choose how long each slot plays. Cell counts full plays of its pattern; Bar gives that slot a fixed number of bars.',
    notice: 'Example: A set to 2 Cell plays its pattern twice, then moves to B. A set to 2 Bar plays for two bars, then moves on. After all phrases and repeats, the sequence starts again.',
  },
  {
    target: 'riff-cell-timing', title: 'How this replaces Riff Restart',
    text: 'Riff Restart normally decides when the riff jumps back to its beginning. While Cell Sequencer is On, these timing controls take over that job.',
    notice: 'Global restarts at the Section Bars limit. Per Cell restarts after the arranged slots and phrase repeats finish. Turn Cell Sequencer Off to use the Bar menu’s Riff Restart setting again.',
  },
  {
    target: 'riff-cell-chain', title: 'Chain: finish each phrase, then move on',
    text: 'In Global mode, Chain gives each phrase the Section Bars length for each repeat. A phrase at ×2 with 4 Section Bars plays two four-bar passes, then advances.',
    notice: 'Per Cell already advances using each slot’s own length. Start with one phrase and Global; try Chain when you want several timed sections.',
  },
];
