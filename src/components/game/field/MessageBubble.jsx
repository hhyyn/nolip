import { Card } from 'pixel-retroui';
import { motion, AnimatePresence } from 'framer-motion';

export const MessageBubble = ({ message, direction = 'right' }) => {
    const isRight = direction === 'right';

    return (
        <AnimatePresence>
            {message && (
                <motion.div
                    initial={{ opacity: 0, x: isRight ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isRight ? 20 : -20 }}
                    className={`flex items-center ${isRight ? "justify-start" : "justify-end"}`}
                >
                    <Card
                        bg="white"
                        textColor="black"
                        borderColor="black"
                        shadowColor="black"
                        className="py-1 px-2"
                    >
                        <p className="text-sm">{message}</p>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>
    );
}; 