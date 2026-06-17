import { Mail, MessageSquare, MapPin, Phone, Send } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";

export default function ContactUs() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground p-8">
      <div className="max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-12">
        
        {/* Left Column - Contact Info */}
        <div className="flex flex-col justify-center">
          <div className="mb-8">
            <h1 className="text-4xl font-black tracking-tight mb-4 flex items-center gap-3">
              <MessageSquare className="size-10 text-primary" />
              Get in Touch
            </h1>
            <p className="text-lg text-muted-foreground">
              Have questions about Guard Shield? Need enterprise support or custom integrations? Our team is here to help you secure your networks.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <Mail className="size-6" />
              </div>
              <div>
                <h3 className="font-semibold">Email Support</h3>
                <p className="text-muted-foreground">support@guardshield.dev</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
              <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-500">
                <Phone className="size-6" />
              </div>
              <div>
                <h3 className="font-semibold">Enterprise Hot-line</h3>
                <p className="text-muted-foreground">+1 (800) 555-0199</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
              <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-500">
                <MapPin className="size-6" />
              </div>
              <div>
                <h3 className="font-semibold">Headquarters</h3>
                <p className="text-muted-foreground">128 Cyber Security Way, Tech District</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Contact Form */}
        <div className="rounded-2xl border bg-card text-card-foreground shadow-lg p-8 flex flex-col">
          <h2 className="text-2xl font-bold mb-6">Send us a message</h2>
          
          <form className="flex-1 flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">First Name</label>
                <Input placeholder="John" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Last Name</label>
                <Input placeholder="Doe" />
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" placeholder="john@company.com" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Subject</label>
              <Input placeholder="How can we help?" />
            </div>

            <div className="flex flex-col gap-2 flex-1">
              <label className="text-sm font-medium">Message</label>
              <textarea 
                className="flex-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px] resize-none"
                placeholder="Tell us about your project or issue..."
              ></textarea>
            </div>

            <Separator className="my-2" />

            <Button type="submit" className="w-full text-md h-12">
              <Send className="size-4 mr-2" />
              Send Message
            </Button>
          </form>
        </div>

      </div>
    </div>
  );
}
