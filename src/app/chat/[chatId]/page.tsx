
'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { useUser } from '@/firebase';
import { Header } from '@/components/Header';
import { Message as MessageType, UserProfile } from '@/lib/types';
import { Loader2, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function ChatPage() {
  const { chatId } = useParams();
  const { user, db, loading: userLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<MessageType[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mark messages as read
  useEffect(() => {
    if (!db || !user || !chatId) return;

    const markMessagesAsRead = async () => {
      const messagesQuery = query(
        collection(db, 'chats', chatId as string, 'messages'),
        where('receiverId', '==', user.uid),
        where('isRead', '==', false)
      );

      const querySnapshot = await getDocs(messagesQuery);
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.update(doc.ref, { isRead: true });
      });

      if (!querySnapshot.empty) {
        await batch.commit();
      }
    };

    markMessagesAsRead();
  }, [db, user, chatId, messages]); // Rerun when messages change as well


  useEffect(() => {
    if (!db || !user || !chatId) return;

    const chatRef = doc(db, 'chats', chatId as string);

    const getOtherUser = async () => {
        const chatSnap = await getDoc(chatRef);
        if (chatSnap.exists()) {
            const participants = chatSnap.data().participants as string[];
            const otherUserId = participants.find(p => p !== user.uid);
            if(otherUserId){
                const userRef = doc(db, 'users', otherUserId);
                const userSnap = await getDoc(userRef);
                if(userSnap.exists()){
                    setOtherUser(userSnap.data() as UserProfile);
                }
            } else {
                 toast({ variant: 'destructive', title: 'Chat error', description: "Could not find the other user in this chat." });
                router.push('/chats');
            }
        } else {
            toast({ variant: 'destructive', title: 'Chat not found' });
            router.push('/chats');
        }
    };
    
    getOtherUser();

    const messagesQuery = query(
      collection(db, 'chats', chatId as string, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as MessageType)
      );
      setMessages(msgs);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db, user, chatId, router, toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user || !newMessage.trim() || !otherUser) return;

    try {
      const messagesCol = collection(db, 'chats', chatId as string, 'messages');
      await addDoc(messagesCol, {
        chatId,
        senderId: user.uid,
        receiverId: otherUser.uid,
        text: newMessage,
        timestamp: serverTimestamp(),
        isRead: false,
      });

      // Update the last message on the chat document
      const chatRef = doc(db, 'chats', chatId as string);
      await updateDoc(chatRef, {
        lastMessage: {
            text: newMessage,
            timestamp: serverTimestamp()
        }
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message.',
      });
    }
  };

  const formatTimestamp = (timestamp: Timestamp | null) => {
    if (!timestamp) return '';
    return format(timestamp.toDate(), 'p');
  }

  if (userLoading || isLoading || !otherUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="border-b bg-card p-4">
            <div className="container mx-auto flex items-center gap-4">
                 <Avatar>
                    <AvatarImage src="" alt={otherUser.name} />
                    <AvatarFallback>{otherUser.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <h1 className="text-xl font-bold">{otherUser.name}</h1>
                    <p className="text-sm text-muted-foreground">{otherUser.role}</p>
                </div>
            </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="container mx-auto max-w-4xl space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex items-end gap-3',
                  msg.senderId === user.uid ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.senderId !== user.uid && (
                  <Avatar className="h-8 w-8">
                     <AvatarImage src="" alt={otherUser.name} />
                    <AvatarFallback>{otherUser.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    'max-w-xs rounded-lg p-3 md:max-w-md',
                    msg.senderId === user.uid
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="text-sm">{msg.text}</p>
                  <p className={cn("text-xs mt-1",  msg.senderId === user.uid ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {formatTimestamp(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div className="border-t bg-background p-4">
          <div className="container mx-auto max-w-4xl">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                autoComplete="off"
              />
              <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
