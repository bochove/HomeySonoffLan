# Readme

I wanted to be able to make use of Sonoff devices as is with a low memory usage for Homey.
So without the need to solder things and update it's firmware.

This has the downside that you will be required to keep the Sonoff in [lan-mode](https://help.ewelink.cc/hc/en-us/articles/360007134171-LAN-Mode-Tutorial) and give it a fixed IP address.
Since you cannot do either from the Sonoff you will need to be able to do so in your router.

That's where it gets hard, since many routers won't let you set fixed IP addresses based on MAC addresses or block them from accessing the internet.
If you can set that up, then this app might just be the perfect Homey Sonoff app for you.

You can toggle it from Homey, and toggling the Sonoff will also update the status on Homey in real time.
It also features automatically reconnecting and retrying to send switch commands when a confirmation of the executed switch command is not received timely.
It also features a regular heartbeat check to make sure the connection stays open so toggling the Sonoff will instantly update the status on Homey.
So the Sonoff can trigger flows etc.
