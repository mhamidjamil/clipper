
'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
  orderBy,
} from 'firebase/firestore';
import { useUser } from '@/firebase';
import { Header } from '@/components/Header';
import { Chat, UserProfile } from '@/lib/types';
import { Loader2, MessageSquare } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

export default function ChatsPage() {
  const { user, db, userProfile, loading: userLoading } = useUser();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!db || !user || userLoading) return;

    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      const chatPromises = snapshot.docs.map(async (chatDoc) => {
        const chatData = chatDoc.data();
        const otherParticipantId = chatData.participants.find(
          (p: string) => p !== user.uid
        );

        let otherParticipantProfile: UserProfile | null = null;
        if (otherParticipantId) {
          const userRef = doc(db, 'users', otherParticipantId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            otherParticipantProfile = userSnap.data() as UserProfile;
          }
        }

        return {
          id: chatDoc.id,
          ...chatData,
          participantDetails: otherParticipantProfile ? [otherParticipantProfile] : [],
        } as Chat;
      });

      const resolvedChats = await Promise.all(chatPromises);
      
      // Sort chats by last message timestamp
      resolvedChats.sort((a, b) => {
        const timeA = a.lastMessage?.timestamp?.toMillis() || 0;
        const timeB = b.lastMessage?.timestamp?.toMillis() || 0;
        return timeB - timeA;
      });

      setChats(resolvedChats);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db, user, userLoading]);

  const getOtherParticipant = (chat: Chat) => {
    return chat.participantDetails[0];
  };

  if (userLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-4xl p-4 md:p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Chats</h1>
          <p className="text-muted-foreground">
            View your recent conversations.
          </p>
        </div>

        {chats.length === 0 ? (
          <Card className="text-center p-8">
            <CardContent className="pt-6">
              <MessageSquare className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No Conversations Yet</CardTitle>
              <CardDescription className="mb-4">
                Start a conversation with a {userProfile?.role === 'client' ? 'barber' : 'client'}.
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {chats.map((chat) => {
              const otherUser = getOtherParticipant(chat);
              if (!otherUser) return null; // Don't render chat if other user details are not available
              return (
                <Card
                  key={chat.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/chat/${chat.id}`)}
                >
                  <CardContent className="pt-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src="" alt={otherUser.name} />
                        <AvatarFallback>{otherUser.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold">{otherUser.name}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                          {chat.lastMessage?.text || 'No messages yet...'}
                        </p>
                      </div>
                    </div>
                    {chat.lastMessage?.timestamp && (
                        <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(chat.lastMessage.timestamp.toDate(), { addSuffix: true })}
                        </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
