# **App Name**: SEMS Monitoring

## Core Features:

- Simple Authentication: User-friendly login page with a clean, minimalistic design to ensure easy access for management staff and admins.
- Real-time Monitoring Dashboard: A real-time monitoring dashboard displaying data of all Smart Electric Metering Systems with essential details. Mimics what is presented on the image attached (Serial Number, Name, Address, Time, Power KW, Tampering Status, Actuation State, and Status). Each entry contains two functional buttons (Alert and Billing).
- Billing Statement Generation: A button available on each entry of the dashboard that redirects to the Billing Page dedicated for that specific Smart Electric Metering System. Primary Function is to generate a billing statement of that specific meter and have an option to send it via SMS or GMail.
- Alert and Notification System: Accessible via the Alert Button located on each entry, provides Outage Alert generation with information (whether it was scheduled or not) and a Tampering Alert generator for notifying outage caused by tampering with the option of sending alerts via SMS or GMail. LLM will be used as a tool to assemble relevant pieces of information to formulate notification messages.
- Sample Data Generation: Generates simulated smart electric meter data, with user names and addresses from Cordillera Administrative Region, Benguet, and Baguio; plus a variety of real-time stats. Designed to make a good-looking, informative UI demo possible even with zero back end.

## Style Guidelines:

- Primary color: Forest green (#556B2F), drawing inspiration from concepts of renewable energy and ecological conservation, conveys stability, growth, and environmental friendliness. (Muted)
- Background color: Light sage (#F5F5DC) evokes a sense of natural harmony. (Muted)
- Accent color: Sky blue (#B0E2FF), a close analogous color of green, that embodies clarity, connectivity and innovation (Muted)
- Font Pairing: 'Space Grotesk' (sans-serif) for headings and 'Inter' (sans-serif) for body.
- Simple, crisp icons representing meter status, alerts, and billing functions.
- Clean, table-based layout for the monitoring dashboard to display essential smart meter data.
- Subtle transitions and animations for interactive elements, such as button hover effects and loading states.