package config

type TheatreConfig struct {
	Name       string
	Driver     string
	DriverArgs map[string]any
}

type Config struct {
	Name     string
	Timezone string
	Theatres []TheatreConfig
}
