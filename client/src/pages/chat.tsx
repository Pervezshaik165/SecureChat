import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { api, type User, type Message } from "@/lib/api";
import { initSocket, disconnectSocket } from "@/lib/socket";
import { encryptMessage, decryptMessage, generateSharedKey } from "@/lib/encryption";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Send, 
  Search, 
  MoreVertical, 
  Phone, 
  Video, 
  Smile, 
  Paperclip, 
  LogOut, 
  UserPlus,
  Check,
  CheckCheck,
  Lock
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import chatBg from '@assets/generated_images/subtle_chat_background_pattern.png';

export default function ChatPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [contacts, setContacts] = useState<User[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<ReturnType<typeof initSocket> | null>(null);

  // Initialize
  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
      setLocation("/auth");
      return;
    }

    const user = JSON.parse(userStr) as User;
    setCurrentUser(user);
    loadContacts(user._id);

    // Initialize Socket.io
    const socket = initSocket();
    socketRef.current = socket;

    socket.emit('register_user', user._id);

    socket.on('receive_message', (message: Message) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    });

    socket.on('message_status_update', ({ messageId, status }: { messageId: string, status: string }) => {
      setMessages(prev => prev.map(m => 
        m._id === messageId ? { ...m, status: status as 'sent' | 'delivered' | 'read' } : m
      ));
    });

    socket.on('user_online', (userId: string) => {
      setContacts(prev => prev.map(c => 
        c._id === userId ? { ...c, isOnline: true } : c
      ));
    });

    socket.on('user_typing', (userId: string) => {
      // Show typing indicator
    });

    return () => {
      disconnectSocket();
    };
  }, [location, setLocation]);

  // Refresh messages when selected contact changes
  useEffect(() => {
    if (selectedContactId && currentUser) {
      refreshMessages();
    }
  }, [selectedContactId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const loadContacts = async (userId: string) => {
    try {
      const contactsList = await api.getContacts(userId);
      setContacts(contactsList);
    } catch (error) {
      console.error("Failed to load contacts:", error);
    }
  };

  const refreshMessages = async () => {
    if (!selectedContactId || !currentUser) return;
    try {
      const msgs = await api.getMessages(currentUser._id, selectedContactId);
      setMessages(msgs);
      scrollToBottom();
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || !selectedContactId || !currentUser || !socketRef.current) return;

    try {
      const sharedKey = generateSharedKey(currentUser._id, selectedContactId);
      const encrypted = encryptMessage(inputValue, sharedKey);
      
      socketRef.current.emit('send_message', {
        senderId: currentUser._id,
        receiverId: selectedContactId,
        encryptedContent: encrypted
      });
      
      setInputValue("");
    } catch (error) {
      toast({ variant: "destructive", title: "Error sending message" });
    }
  };

  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2 || !currentUser) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await api.searchUsers(query, currentUser._id);
      const currentContactIds = contacts.map(c => c._id);
      setSearchResults(results.filter(r => !currentContactIds.includes(r._id)));
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddContact = async (contactId: string) => {
    if (!currentUser) return;
    try {
      await api.addContact(currentUser._id, contactId);
      await loadContacts(currentUser._id);
      setSearchQuery("");
      setSearchResults([]);
      toast({ title: "Contact added" });
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to add contact" });
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      await api.logout(currentUser._id);
    }
    disconnectSocket();
    localStorage.removeItem('currentUser');
    setLocation("/auth");
  };

  const selectedContact = contacts.find(c => c._id === selectedContactId);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="w-full md:w-80 lg:w-96 border-r flex flex-col bg-background z-10">
        <div className="h-16 px-4 border-b flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-background cursor-pointer hover:opacity-80 transition-opacity">
              <AvatarImage src={currentUser?.avatar} />
              <AvatarFallback>{currentUser?.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="font-semibold truncate max-w-[120px]">{currentUser?.username}</span>
          </div>
          <div className="flex items-center gap-1">
             <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Add Contact" data-testid="button-add-contact">
                  <UserPlus className="h-5 w-5 text-muted-foreground" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search by username..." 
                      className="pl-8" 
                      value={searchQuery}
                      onChange={(e) => handleSearchUsers(e.target.value)}
                      data-testid="input-search-users"
                    />
                  </div>
                  <div className="space-y-2">
                    {isSearching && <p className="text-sm text-muted-foreground text-center">Searching...</p>}
                    {searchResults.map(user => (
                      <div key={user._id} className="flex items-center justify-between p-2 hover:bg-muted rounded-md border" data-testid={`user-result-${user._id}`}>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>{user.username[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.username}</span>
                        </div>
                        <Button size="sm" onClick={() => handleAddContact(user._id)} data-testid={`button-add-${user._id}`}>Add</Button>
                      </div>
                    ))}
                    {!isSearching && searchQuery && searchResults.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center">No users found</p>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="icon" title="Logout" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
        </div>

        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search or start new chat" className="pl-8 bg-muted/50 border-none" />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            {contacts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No contacts yet. Click the + icon to add someone!
              </div>
            ) : (
              contacts.map(contact => (
                <div
                  key={contact._id}
                  onClick={() => setSelectedContactId(contact._id)}
                  className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/40 ${
                    selectedContactId === contact._id ? "bg-muted" : ""
                  }`}
                  data-testid={`contact-${contact._id}`}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12 border border-border">
                      <AvatarImage src={contact.avatar} />
                      <AvatarFallback>{contact.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${contact.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-medium truncate">{contact.username}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      Click to start chatting
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      {selectedContact ? (
        <div className="flex-1 flex flex-col bg-[#efeae2] dark:bg-background relative">
          <div 
            className="absolute inset-0 opacity-40 dark:opacity-5 pointer-events-none" 
            style={{ backgroundImage: `url(${chatBg})`, backgroundSize: '400px' }}
          />

          <div className="h-16 px-4 border-b flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedContact.avatar} />
                <AvatarFallback>{selectedContact.username[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-semibold">{selectedContact.username}</span>
                <span className="text-xs text-muted-foreground">
                  {selectedContact.isOnline ? 'Online' : `Last seen ${format(new Date(selectedContact.lastSeen), 'MMM d, HH:mm')}`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon"><Video className="h-5 w-5 text-muted-foreground" /></Button>
              <Button variant="ghost" size="icon"><Phone className="h-5 w-5 text-muted-foreground" /></Button>
              <div className="w-px h-6 bg-border mx-1" />
              <Button variant="ghost" size="icon"><Search className="h-5 w-5 text-muted-foreground" /></Button>
              <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5 text-muted-foreground" /></Button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4 z-10">
            <div className="flex flex-col gap-2 pb-4 max-w-4xl mx-auto">
              <div className="flex justify-center my-4">
                <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs px-3 py-1.5 rounded-md shadow-sm flex items-center gap-1.5 max-w-[90%] text-center">
                  <Lock className="h-3 w-3 flex-shrink-0" />
                  Messages are end-to-end encrypted. No one outside of this chat, not even the server, can read or listen to them.
                </div>
              </div>

              {messages.map((msg) => {
                const isMe = msg.senderId === currentUser?._id;
                const sharedKey = generateSharedKey(currentUser!._id, selectedContactId!);
                const decryptedContent = decryptMessage(msg.encryptedContent, sharedKey);

                return (
                  <div
                    key={msg._id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    data-testid={`message-${msg._id}`}
                  >
                    <div
                      className={`
                        max-w-[75%] md:max-w-[60%] px-3 py-2 rounded-lg shadow-sm relative group
                        ${isMe 
                          ? "bg-[#dcf8c6] dark:bg-primary/20 text-foreground rounded-tr-none" 
                          : "bg-white dark:bg-card text-foreground rounded-tl-none"
                        }
                      `}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words pr-6">
                        {decryptedContent}
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-1 select-none">
                        <span className="text-[10px] text-muted-foreground/80">
                          {format(msg.timestamp, 'HH:mm')}
                        </span>
                        {isMe && (
                          <span className={`${msg.status === 'read' ? 'text-blue-500' : 'text-muted-foreground'}`}>
                            {msg.status === 'sent' && <Check className="h-3 w-3" />}
                            {msg.status === 'delivered' && <CheckCheck className="h-3 w-3" />}
                            {msg.status === 'read' && <CheckCheck className="h-3 w-3" />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="p-3 bg-background border-t z-10">
            <form onSubmit={handleSendMessage} className="flex items-end gap-2 max-w-4xl mx-auto">
              <Button type="button" variant="ghost" size="icon" className="mb-1">
                <Smile className="h-6 w-6 text-muted-foreground" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="mb-1">
                <Paperclip className="h-6 w-6 text-muted-foreground" />
              </Button>
              
              <div className="flex-1 bg-muted/30 rounded-2xl border focus-within:ring-1 focus-within:ring-ring transition-all">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type a message"
                  className="border-none bg-transparent focus-visible:ring-0 min-h-[44px] py-3"
                  data-testid="input-message"
                />
              </div>

              <Button 
                type="submit" 
                size="icon" 
                disabled={!inputValue.trim()}
                className="h-11 w-11 rounded-full mb-px shrink-0 transition-transform active:scale-95"
                data-testid="button-send"
              >
                <Send className="h-5 w-5 ml-0.5" />
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-muted/10 border-l">
          <div className="max-w-md text-center space-y-4 p-8">
            <div className="w-64 h-64 mx-auto bg-muted/20 rounded-full flex items-center justify-center mb-6">
               <img src={chatBg} className="w-48 h-48 opacity-20 object-cover rounded-full" alt="Secure Chat" />
            </div>
            <h1 className="text-3xl font-light text-foreground">SecureChat Web</h1>
            <p className="text-muted-foreground">
              Send and receive messages without keeping your phone online.<br/>
              Use SecureChat on up to 4 linked devices and 1 phone.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-8">
              <Lock className="h-3 w-3" />
              End-to-end encrypted
            </div>
          </div>
          <div className="absolute bottom-0 w-full h-2 bg-primary" />
        </div>
      )}
    </div>
  );
}
