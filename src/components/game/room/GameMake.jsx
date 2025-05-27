import CreateGame from "./CreateGame";
import JoinGame from "./JoinGame";

export default function GameMake({ onCreateGame, onJoinGame }) {
    return (
        <div className="w-full h-full flex items-center justify-center px-4">
            <div className="flex justify-center gap-8 w-full h-full max-w-4xl py-20">
                <CreateGame onCreateGame={onCreateGame} />
                <JoinGame onJoinGame={onJoinGame} />
            </div>
        </div>
    );
}
