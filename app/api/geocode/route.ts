import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const address = body?.address?.trim();

    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;

    if (!apiKey) {
      console.error("GOOGLE_GEOCODING_API_KEY is not configured");

      return NextResponse.json(
        { error: "Geocoding service is not configured" },
        { status: 500 }
      );
    }

    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?address=${encodeURIComponent(address)}` +
      `&key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        "Google Geocoding HTTP error:",
        response.status,
        response.statusText
      );

      return NextResponse.json(
        { error: "Geocoding service request failed" },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (data.status !== "OK" || !data.results?.length) {
      console.error("Google Geocoding error:", data.status);

      return NextResponse.json(
        {
          error: "Location could not be found",
          status: data.status,
        },
        { status: 404 }
      );
    }

    const result = data.results[0];

    const latitude = result.geometry.location.lat;
    const longitude = result.geometry.location.lng;

    return NextResponse.json({
      success: true,
      latitude,
      longitude,
      formattedAddress: result.formatted_address,
    });
  } catch (error) {
    console.error("Geocoding route error:", error);

    return NextResponse.json(
      { error: "Something went wrong while geocoding the location" },
      { status: 500 }
    );
  }
}