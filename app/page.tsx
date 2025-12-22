'use client';

import { useGameStore } from '@/lib/store';
import MainMenu from '@/components/MainMenu';
import Lobby from '@/components/Lobby';
import Game from '@/components/Game';

export default function Home() {
  const { currentView } = useGameStore();

  return (
    <>
      {currentView === 'menu' && <MainMenu />}
      {currentView === 'lobby' && <Lobby />}
      {currentView === 'game' && <Game />}
    </>
  );
}
